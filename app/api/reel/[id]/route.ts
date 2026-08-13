// /app/api/reel/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import db from "@/utils/db";
import Reel from "@/models/Reel";
import User from "@/models/User";
import Language from "@/models/Language";
import { getSession } from "@/lib/server";

type ReelMediaType = "video" | "audio";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type ReelMedia = {
  image_url?: unknown;
  public_id?: unknown;
};

function isValidReelId(id: string) {
  return mongoose.Types.ObjectId.isValid(id);
}

function isValidMediaType(value: unknown): value is ReelMediaType {
  return value === "video" || value === "audio";
}

function normalizeTags(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((tag): tag is string => typeof tag === "string")
    .map((tag) => tag.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 20);
}

function normalizeMedia(value: unknown) {
  if (!value || typeof value !== "object") {
    return null;
  }

  const media = value as ReelMedia;

  if (
    typeof media.image_url !== "string" ||
    !media.image_url.trim() ||
    typeof media.public_id !== "string" ||
    !media.public_id.trim()
  ) {
    return null;
  }

  return {
    image_url: media.image_url.trim(),
    public_id: media.public_id.trim(),
  };
}

async function getAuthorizedReel(
  reelId: string,
  sessionUserId: string,
) {
  const reel = await Reel.findById(reelId);

  if (!reel) {
    return {
      reel: null,
      error: NextResponse.json(
        {
          message: "Reel not found.",
        },
        {
          status: 404,
        },
      ),
    };
  }

  if (reel.author.toString() !== sessionUserId) {
    return {
      reel: null,
      error: NextResponse.json(
        {
          message: "You can only modify your own reels.",
        },
        {
          status: 403,
        },
      ),
    };
  }

  return {
    reel,
    error: null,
  };
}

export async function GET(
  _request: NextRequest,
  context: RouteContext,
) {
  try {
    await db.connect();

    const { id } = await context.params;

    if (!isValidReelId(id)) {
      return NextResponse.json(
        {
          message: "Invalid reel ID.",
        },
        {
          status: 400,
        },
      );
    }

    const reel = await Reel.findById(id)
      .populate({
        path: "author",
        select: "name email avatar",
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

    if (!reel) {
      return NextResponse.json(
        {
          message: "Reel not found.",
        },
        {
          status: 404,
        },
      );
    }

    return NextResponse.json(
      {
        reel,
      },
      {
        status: 200,
      },
    );
  } catch (error) {
    console.error("GET /api/reel/[id] error:", error);

    return NextResponse.json(
      {
        message: "Failed to fetch reel.",
      },
      {
        status: 500,
      },
    );
  }
}

export async function PUT(
  request: NextRequest,
  context: RouteContext,
) {
  try {
    await db.connect();

    const session = await getSession();

    if (!session?.user?.id) {
      return NextResponse.json(
        {
          message: "Unauthorized.",
        },
        {
          status: 401,
        },
      );
    }

    const { id } = await context.params;

    if (!isValidReelId(id)) {
      return NextResponse.json(
        {
          message: "Invalid reel ID.",
        },
        {
          status: 400,
        },
      );
    }

    const { error: authorizationError } = await getAuthorizedReel(
      id,
      String(session.user.id),
    );

    if (authorizationError) {
      return authorizationError;
    }

    const body = await request.json();

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

    const type = body.type;

    const media = normalizeMedia(body.media);

    if (!caption) {
      return NextResponse.json(
        {
          message: "Caption is required.",
        },
        {
          status: 400,
        },
      );
    }

    if (caption.length > 2000) {
      return NextResponse.json(
        {
          message: "Caption cannot exceed 2,000 characters.",
        },
        {
          status: 400,
        },
      );
    }

    if (!languageId || !mongoose.Types.ObjectId.isValid(languageId)) {
      return NextResponse.json(
        {
          message: "A valid language selection is required.",
        },
        {
          status: 400,
        },
      );
    }

    const language = await Language.findById(languageId)
      .select("_id")
      .lean();

    if (!language) {
      return NextResponse.json(
        {
          message: "The selected language does not exist.",
        },
        {
          status: 404,
        },
      );
    }

    if (!isValidMediaType(type)) {
      return NextResponse.json(
        {
          message: "Media type must be audio or video.",
        },
        {
          status: 400,
        },
      );
    }

    if (!media) {
      return NextResponse.json(
        {
          message: "A valid media file is required.",
        },
        {
          status: 400,
        },
      );
    }

    if (transcription.length > 5000) {
      return NextResponse.json(
        {
          message: "Transcription cannot exceed 5,000 characters.",
        },
        {
          status: 400,
        },
      );
    }

    if (translation.length > 5000) {
      return NextResponse.json(
        {
          message: "Translation cannot exceed 5,000 characters.",
        },
        {
          status: 400,
        },
      );
    }

    const updated = await Reel.findByIdAndUpdate(
      id,
      {
        $set: {
          caption,
          tags: normalizeTags(body.tags),
          transcription,
          translation,
          language: languageId,
          media,
          type,
        },
      },
      {
        new: true,
        runValidators: true,
      },
    )
      .populate({
        path: "author",
        select: "name email avatar",
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
        {
          message: "Reel not found.",
        },
        {
          status: 404,
        },
      );
    }

    return NextResponse.json(
      {
        message: "Reel updated successfully.",
        reel: updated,
      },
      {
        status: 200,
      },
    );
  } catch (error) {
    console.error("PUT /api/reel/[id] error:", error);

    return NextResponse.json(
      {
        message: "Failed to update reel.",
      },
      {
        status: 500,
      },
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  context: RouteContext,
) {
  try {
    await db.connect();

    const session = await getSession();

    if (!session?.user?.id) {
      return NextResponse.json(
        {
          message: "Unauthorized.",
        },
        {
          status: 401,
        },
      );
    }

    const { id } = await context.params;

    if (!isValidReelId(id)) {
      return NextResponse.json(
        {
          message: "Invalid reel ID.",
        },
        {
          status: 400,
        },
      );
    }

    const { error: authorizationError } = await getAuthorizedReel(
      id,
      String(session.user.id),
    );

    if (authorizationError) {
      return authorizationError;
    }

    const deleted = await Reel.findByIdAndDelete(id);

    if (!deleted) {
      return NextResponse.json(
        {
          message: "Reel not found.",
        },
        {
          status: 404,
        },
      );
    }

    return NextResponse.json(
      {
        message: "Reel deleted successfully.",
        deletedMediaPublicId: deleted.media?.public_id || null,
      },
      {
        status: 200,
      },
    );
  } catch (error) {
    console.error("DELETE /api/reel/[id] error:", error);

    return NextResponse.json(
      {
        message: "Failed to delete reel.",
      },
      {
        status: 500,
      },
    );
  }
}