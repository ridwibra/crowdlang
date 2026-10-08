// app/api/reel/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import db from "@/utils/db";
import Reel from "@/models/Reel";
import User from "@/models/User";
import Language from "@/models/Language";
import { getSession } from "@/lib/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

async function getAuthorizedReel(id: string, email: string) {
  const mongoUser = await User.findOne({ email }).select("_id role");

  if (!mongoUser) {
    return {
      reel: null,
      error: NextResponse.json(
        { message: "User not found in database." },
        { status: 404 },
      ),
    };
  }

  const reel = await Reel.findById(id);

  if (!reel) {
    return {
      reel: null,
      error: NextResponse.json(
        { message: "Reel not found." },
        { status: 404 },
      ),
    };
  }

  const isPrivileged =
    mongoUser.role === "admin" || mongoUser.role === "root";

  const isAuthor =
    reel.author != null &&
    reel.author.toString() === mongoUser._id.toString();

  if (!isAuthor && !isPrivileged) {
    return {
      reel: null,
      error: NextResponse.json(
        {
          message:
            "Only this reel's author, an admin, or root can edit or delete it.",
        },
        { status: 403 },
      ),
    };
  }

  return { reel, error: null };
}

function populateReel(query: any) {
  return query
    .populate({
      path: "author",
      select: "name email avatar image",
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
    });
}

export async function GET(
  _request: NextRequest,
  context: RouteContext,
) {
  try {
    const { id } = await context.params;

    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { message: "Invalid reel ID." },
        { status: 400 },
      );
    }

    await db.connect();

    const reel = await populateReel(Reel.findById(id)).lean();

    if (!reel) {
      return NextResponse.json(
        { message: "Reel not found." },
        { status: 404 },
      );
    }

    return NextResponse.json({ reel });
  } catch (error) {
    console.error("GET /api/reel/[id] error:", error);

    return NextResponse.json(
      { message: "Failed to fetch reel." },
      { status: 500 },
    );
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
        { message: "Please sign in to edit a reel." },
        { status: 401 },
      );
    }

    const { id } = await context.params;

    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { message: "Invalid reel ID." },
        { status: 400 },
      );
    }

    await db.connect();

    const { error } = await getAuthorizedReel(id, session.user.email);
    if (error) return error;

    const body = await request.json().catch(() => null);

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json(
        { message: "A valid request body is required." },
        { status: 400 },
      );
    }

    const caption =
      typeof body.caption === "string" ? body.caption.trim() : "";
    const transcription =
      typeof body.transcription === "string"
        ? body.transcription.trim()
        : "";
    const translation =
      typeof body.translation === "string"
        ? body.translation.trim()
        : "";
    const languageId =
      typeof body.language === "string" ? body.language.trim() : "";

    if (!caption || caption.length > 2000) {
      return NextResponse.json(
        { message: "Caption must contain between 1 and 2,000 characters." },
        { status: 400 },
      );
    }

    if (!Types.ObjectId.isValid(languageId)) {
      return NextResponse.json(
        { message: "A valid language selection is required." },
        { status: 400 },
      );
    }

    if (body.type !== "audio" && body.type !== "video") {
      return NextResponse.json(
        { message: "Media type must be audio or video." },
        { status: 400 },
      );
    }

    if (
      typeof body.media?.image_url !== "string" ||
      !body.media.image_url.trim() ||
      typeof body.media?.public_id !== "string" ||
      !body.media.public_id.trim()
    ) {
      return NextResponse.json(
        { message: "A valid media URL and public ID are required." },
        { status: 400 },
      );
    }

    if (transcription.length > 5000 || translation.length > 5000) {
      return NextResponse.json(
        {
          message:
            "Transcription and translation cannot exceed 5,000 characters each.",
        },
        { status: 400 },
      );
    }

    const language = await Language.findById(languageId).select("_id");

    if (!language) {
      return NextResponse.json(
        { message: "The selected language does not exist." },
        { status: 404 },
      );
    }

    const tags = Array.isArray(body.tags)
      ? [
          ...new Set<string>(
            body.tags
              .filter((tag: unknown): tag is string => typeof tag === "string")
              .map((tag: string) => tag.trim().toLowerCase())
              .filter(Boolean),
          ),
        ].slice(0, 20)
      : [];

    const updated = await populateReel(
      Reel.findByIdAndUpdate(
        id,
        {
          $set: {
            caption,
            transcription,
            translation,
            tags,
            language: language._id,
            media: {
              image_url: body.media.image_url.trim(),
              public_id: body.media.public_id,
            },
            type: body.type,
          },
        },
        { new: true, runValidators: true },
      ),
    ).lean();

    if (!updated) {
      return NextResponse.json(
        { message: "Reel not found." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      message: "Reel updated successfully.",
      reel: updated,
    });
  } catch (error) {
    console.error("PUT /api/reel/[id] error:", error);

    return NextResponse.json(
      { message: "Failed to update reel." },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  context: RouteContext,
) {
  try {
    const session = await getSession();

    if (!session?.user?.email) {
      return NextResponse.json(
        { message: "Please sign in to delete a reel." },
        { status: 401 },
      );
    }

    const { id } = await context.params;

    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { message: "Invalid reel ID." },
        { status: 400 },
      );
    }

    await db.connect();

    const { error } = await getAuthorizedReel(id, session.user.email);
    if (error) return error;

    const deleted = await Reel.findByIdAndDelete(id);

    if (!deleted) {
      return NextResponse.json(
        { message: "Reel not found." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      message: "Reel deleted successfully.",
      deletedMediaPublicId: deleted.media?.public_id || null,
    });
  } catch (error) {
    console.error("DELETE /api/reel/[id] error:", error);

    return NextResponse.json(
      { message: "Failed to delete reel." },
      { status: 500 },
    );
  }
}