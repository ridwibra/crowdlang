import { NextRequest, NextResponse } from "next/server";
import db from "@/utils/db";
import Essay from "@/models/Essay";
import User from "@/models/User";
import Language from "@/models/Language";
import { getSession } from "@/lib/server";
import { UserType } from "@/utils/types";

/* GET SINGLE ESSAY */
export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  try {
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
  } catch (error: any) {
    console.error("GET /api/essay/[id] error:", error);

    return NextResponse.json(
      { message: "Failed to fetch essay." },
      { status: 500 },
    );
  }
}

/* UPDATE ESSAY */
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  try {
    await db.connect();

    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { message: "You must be signed in to continue." },
        { status: 401 },
      );
    }

    const user = session.user as typeof session.user & UserType;

    const mongoUser = await User.findOne({
      email: user.email,
    });

    if (!mongoUser) {
      return NextResponse.json(
        { message: "User not found." },
        { status: 404 },
      );
    }

    /*
     * Load the essay before updating it so we can verify ownership.
     */
  const existingEssay = await Essay.findById(id).select(
  "author status",
);

    if (!existingEssay) {
      return NextResponse.json(
        { message: "Essay not found." },
        { status: 404 },
      );
    }

    /*
     * Only the essay author, admin, or root may edit.
     */
    const isAuthor =
      existingEssay.author.toString() === mongoUser._id.toString();

    const isAdmin =
      mongoUser.role === "admin" || mongoUser.role === "root";

    if (!isAuthor && !isAdmin) {
      return NextResponse.json(
        {
          message:
            "You do not have permission to edit this essay.",
        },
        { status: 403 },
      );
    }

    const raw = await request.json();

    const {
      title,
      category,
      body,
      translationTitle,
      translationBody,
      images,
      status,
      level,
      tags,
      language,
    } = raw;

    if (!title || !language) {
      return NextResponse.json(
        { message: "Title and language are required." },
        { status: 400 },
      );
    }

    const safeImages = Array.isArray(images)
      ? images
          .filter((img: any) => img && img.image_url)
          .map((img: any) => ({
            image_url: img.image_url,
            public_id: img.public_id || "",
          }))
      : [];

    const safeTags = Array.isArray(tags)
      ? tags
          .map((t: any) => String(t).trim())
          .filter((t: string) => t.length > 0)
      : [];

    const updated = await Essay.findByIdAndUpdate(
      id,
      {
        title: title.trim(),
        category: category?.trim() || "",
        body: body || "",
        translationTitle: translationTitle?.trim() || "",
        translationBody: translationBody || "",
        images: safeImages,
        status: status || "approved",
        level: level || undefined,
        tags: safeTags,
        language,
        $addToSet: {
          editedBy: mongoUser._id,
        },
      },
      {
        returnDocument: "after",
        runValidators: true,
      },
    )
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
        message: "Essay updated.",
        essay: updated,
      },
      { status: 200 },
    );
  } catch (error: any) {
    console.error("PUT /api/essay/[id] error:", error);

    return NextResponse.json(
      { message: "Failed to update essay." },
      { status: 500 },
    );
  }
}

/* DELETE ESSAY */
export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  try {
    await db.connect();

    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { message: "You must be signed in to continue." },
        { status: 401 },
      );
    }

    const user = session.user as typeof session.user & UserType;

    const mongoUser = await User.findOne({
      email: user.email,
    });

    if (!mongoUser) {
      return NextResponse.json(
        { message: "User not found." },
        { status: 404 },
      );
    }

    /*
     * Load the essay before deleting it so we can verify ownership.
     */
    const existingEssay = await Essay.findById(id).select(
      "author",
    );

    if (!existingEssay) {
      return NextResponse.json(
        { message: "Essay not found." },
        { status: 404 },
      );
    }

    /*
     * Only the essay author, admin, or root may delete.
     */
    const isAuthor =
      existingEssay.author.toString() === mongoUser._id.toString();

    const isAdmin =
      mongoUser.role === "admin" || mongoUser.role === "root";

    if (!isAuthor && !isAdmin) {
      return NextResponse.json(
        {
          message:
            "You do not have permission to delete this essay.",
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

    return NextResponse.json(
      { message: "Essay deleted." },
      { status: 200 },
    );
  } catch (error: any) {
    console.error("DELETE /api/essay/[id] error:", error);

    return NextResponse.json(
      { message: "Failed to delete essay." },
      { status: 500 },
    );
  }
}