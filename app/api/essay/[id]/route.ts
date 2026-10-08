// app/api/essay/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import db from "@/utils/db";
import Essay from "@/models/Essay";
import User from "@/models/User";
import Language from "@/models/Language";
import { getSession } from "@/lib/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const ESSAY_LEVELS = ["beginner", "intermediate", "advanced"];

function hasEssayManagementPermission(
  userId: Types.ObjectId,
  role: string,
  author: Types.ObjectId | string | null | undefined,
): boolean {
  if (role === "admin" || role === "root") {
    return true;
  }

  if (author === null || author === undefined) {
    return false;
  }

  return userId.toString() === author.toString();
}

function errorResponse(error: unknown, fallback: string) {
  const name = error instanceof Error ? error.name : "";

  const status =
    error instanceof SyntaxError ||
    name === "ValidationError" ||
    name === "CastError"
      ? 400
      : 500;

  return NextResponse.json(
    {
      message:
        status === 400 && error instanceof Error
          ? error.message
          : fallback,
    },
    { status },
  );
}

export async function GET(
  _req: NextRequest,
  context: RouteContext,
) {
  try {
    const { id } = await context.params;

    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { message: "Invalid essay ID." },
        { status: 400 },
      );
    }

    await db.connect();

    const essay = await Essay.findById(id)
      .populate({
        path: "author",
        select: "name email avatar",
        model: User,
      })
      .populate({
        path: "editedBy",
        select: "name email",
        model: User,
      })
      .populate({
        path: "approvedBy",
        select: "name email",
        model: User,
      })
      .populate({
        path: "language",
        select: "name",
        model: Language,
      })
      .lean();

    if (!essay) {
      return NextResponse.json(
        { message: "Essay not found." },
        { status: 404 },
      );
    }

    return NextResponse.json({ essay }, { status: 200 });
  } catch (error: unknown) {
    console.error("GET /api/essay/[id] error:", error);

    return errorResponse(error, "Failed to fetch essay.");
  }
}

export async function PUT(
  request: NextRequest,
  context: RouteContext,
) {
  try {
    const session = await getSession();

    if (!session?.user?.email) {
      return NextResponse.json(
        { message: "Please sign in to edit an essay." },
        { status: 401 },
      );
    }

    const { id } = await context.params;

    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { message: "Invalid essay ID." },
        { status: 400 },
      );
    }

    await db.connect();

    const mongoUser = await User.findOne({
      email: session.user.email,
    }).select("_id role");

    if (!mongoUser) {
      return NextResponse.json(
        { message: "User not found in database." },
        { status: 404 },
      );
    }

    const existingEssay = await Essay.findById(id).select("author");

    if (!existingEssay) {
      return NextResponse.json(
        { message: "Essay not found." },
        { status: 404 },
      );
    }

    if (
      !hasEssayManagementPermission(
        mongoUser._id,
        mongoUser.role,
        existingEssay.author,
      )
    ) {
      return NextResponse.json(
        {
          message:
            "Only this essay's author, an admin, or root can edit it.",
        },
        { status: 403 },
      );
    }

    const raw = await request.json().catch(() => null);

    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      return NextResponse.json(
        { message: "A valid request body is required." },
        { status: 400 },
      );
    }

    const {
      title,
      category,
      body,
      translationTitle,
      translationBody,
      images,
      level,
      tags,
      language,
    } = raw;

    if (
      typeof title !== "string" ||
      !title.trim() ||
      typeof language !== "string" ||
      !Types.ObjectId.isValid(language)
    ) {
      return NextResponse.json(
        { message: "A title and valid language are required." },
        { status: 400 },
      );
    }

    const optionalTextFields = [
      category,
      body,
      translationTitle,
      translationBody,
    ];

    if (
      optionalTextFields.some(
        (value) =>
          value !== undefined &&
          value !== null &&
          typeof value !== "string",
      )
    ) {
      return NextResponse.json(
        { message: "Essay text fields must contain strings." },
        { status: 400 },
      );
    }

    if (
      level !== undefined &&
      level !== null &&
      level !== "" &&
      (typeof level !== "string" || !ESSAY_LEVELS.includes(level))
    ) {
      return NextResponse.json(
        { message: "Invalid essay level." },
        { status: 400 },
      );
    }

    if (images !== undefined && !Array.isArray(images)) {
      return NextResponse.json(
        { message: "Images must be an array." },
        { status: 400 },
      );
    }

    if (Array.isArray(images) && images.length > 3) {
      return NextResponse.json(
        { message: "You can upload up to 3 images." },
        { status: 400 },
      );
    }

    if (tags !== undefined && !Array.isArray(tags)) {
      return NextResponse.json(
        { message: "Tags must be an array." },
        { status: 400 },
      );
    }

    const languageDoc = await Language.findById(language).select("_id");

    if (!languageDoc) {
      return NextResponse.json(
        { message: "Language not found." },
        { status: 404 },
      );
    }

    const safeImages = Array.isArray(images)
      ? images
          .filter(
            (image: any) =>
              image &&
              typeof image.image_url === "string" &&
              image.image_url.trim(),
          )
          .map((image: any) => ({
            image_url: image.image_url.trim(),
            public_id:
              typeof image.public_id === "string"
                ? image.public_id
                : "",
          }))
      : [];

    const safeTags = Array.isArray(tags)
      ? tags
          .filter((tag: unknown): tag is string => typeof tag === "string")
          .map((tag: string) => tag.trim())
          .filter(Boolean)
      : [];

    const setFields: Record<string, unknown> = {
      title: title.trim(),
      category: typeof category === "string" ? category.trim() : "",
      body: typeof body === "string" ? body : "",
      translationTitle:
        typeof translationTitle === "string"
          ? translationTitle.trim()
          : "",
      translationBody:
        typeof translationBody === "string" ? translationBody : "",
      images: safeImages,
      tags: safeTags,
      language: languageDoc._id,
    };

    const update: Record<string, unknown> = {
      $set: setFields,
      $addToSet: {
        editedBy: mongoUser._id,
      },
    };

    if (typeof level === "string" && level) {
      setFields.level = level;
    } else {
      update.$unset = { level: "" };
    }

    // Content editing does not change author, status, or moderation fields.
    const updated = await Essay.findByIdAndUpdate(id, update, {
      new: true,
      runValidators: true,
    })
      .populate({
        path: "author",
        select: "name email avatar",
        model: User,
      })
      .populate({
        path: "editedBy",
        select: "name email",
        model: User,
      })
      .populate({
        path: "approvedBy",
        select: "name email",
        model: User,
      })
      .populate({
        path: "language",
        select: "name",
        model: Language,
      })
      .lean();

    if (!updated) {
      return NextResponse.json(
        { message: "Essay not found." },
        { status: 404 },
      );
    }

    return NextResponse.json(
      {
        message: "Essay updated successfully.",
        essay: updated,
      },
      { status: 200 },
    );
  } catch (error: unknown) {
    console.error("PUT /api/essay/[id] error:", error);

    return errorResponse(error, "Failed to update essay.");
  }
}

export async function DELETE(
  _req: NextRequest,
  context: RouteContext,
) {
  try {
    const session = await getSession();

    if (!session?.user?.email) {
      return NextResponse.json(
        { message: "Please sign in to delete an essay." },
        { status: 401 },
      );
    }

    const { id } = await context.params;

    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { message: "Invalid essay ID." },
        { status: 400 },
      );
    }

    await db.connect();

    const mongoUser = await User.findOne({
      email: session.user.email,
    }).select("_id role");

    if (!mongoUser) {
      return NextResponse.json(
        { message: "User not found in database." },
        { status: 404 },
      );
    }

    const existingEssay = await Essay.findById(id).select("author");

    if (!existingEssay) {
      return NextResponse.json(
        { message: "Essay not found." },
        { status: 404 },
      );
    }

    if (
      !hasEssayManagementPermission(
        mongoUser._id,
        mongoUser.role,
        existingEssay.author,
      )
    ) {
      return NextResponse.json(
        {
          message:
            "Only this essay's author, an admin, or root can delete it.",
        },
        { status: 403 },
      );
    }

    const deleted = await Essay.findByIdAndDelete(id);

    if (!deleted) {
      return NextResponse.json(
        { message: "Essay not found." },
        { status: 404 },
      );
    }

    const imagePublicIds = [
      ...new Set<string>(
        (deleted.images ?? [])
          .map(
            (image: { public_id?: string | null }) => image.public_id,
          )
          .filter(
            (publicId: unknown): publicId is string =>
              typeof publicId === "string" &&
              publicId.trim().length > 0,
          ),
      ),
    ];

    return NextResponse.json(
      {
        message: "Essay deleted successfully.",
        imagePublicIds,
      },
      { status: 200 },
    );
  } catch (error: unknown) {
    console.error("DELETE /api/essay/[id] error:", error);

    return errorResponse(error, "Failed to delete essay.");
  }
}