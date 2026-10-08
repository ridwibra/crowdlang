// app/api/reel/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import db from "@/utils/db";
import Reel from "@/models/Reel";
import User from "@/models/User";
import Language from "@/models/Language";
import { getSession } from "@/lib/server";

export async function GET() {
  try {
    await db.connect();

    const reels = await Reel.find()
      .sort({ createdAt: -1 })
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
      })
      .lean();

    return NextResponse.json({ reels });
  } catch (error) {
    console.error("GET /api/reel error:", error);

    return NextResponse.json(
      { message: "Failed to fetch reels." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session?.user?.email) {
      return NextResponse.json(
        { message: "Please sign in to create a reel." },
        { status: 401 },
      );
    }

    await db.connect();

    const mongoUser = await User.findOne({
      email: session.user.email,
    }).select("_id");

    if (!mongoUser) {
      return NextResponse.json(
        { message: "User not found in database." },
        { status: 404 },
      );
    }

    const body = await request.json().catch(() => null);

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json(
        { message: "A valid request body is required." },
        { status: 400 },
      );
    }

    const caption =
      typeof body.caption === "string" ? body.caption.trim() : "";
    const language =
      typeof body.language === "string" ? body.language.trim() : "";
    const transcription =
      typeof body.transcription === "string"
        ? body.transcription.trim()
        : "";
    const translation =
      typeof body.translation === "string"
        ? body.translation.trim()
        : "";

    if (!caption || caption.length > 2000) {
      return NextResponse.json(
        { message: "Caption must contain between 1 and 2,000 characters." },
        { status: 400 },
      );
    }

    if (!Types.ObjectId.isValid(language)) {
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

    const languageDoc = await Language.findById(language).select("_id");

    if (!languageDoc) {
      return NextResponse.json(
        { message: "Language not found." },
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

    const reel = await Reel.create({
      caption,
      media: {
        image_url: body.media.image_url.trim(),
        public_id: body.media.public_id,
      },
      tags,
      transcription,
      translation,
      type: body.type,
      author: mongoUser._id,
      language: languageDoc._id,
    });

    return NextResponse.json(
      { message: "Reel created successfully.", reel },
      { status: 201 },
    );
  } catch (error) {
    console.error("POST /api/reel error:", error);

    return NextResponse.json(
      { message: "Failed to create reel." },
      { status: 500 },
    );
  }
}