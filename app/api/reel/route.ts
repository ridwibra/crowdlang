// /app/api/reel/route.ts
import { NextRequest, NextResponse } from "next/server";
import db from "@/utils/db";
import Reel from "@/models/Reel";
import User from "@/models/User";
import { getSession } from "@/lib/server";
import { UserType } from "@/utils/types";
import Language from "@/models/Language";

export async function GET() {
  try {
    await db.connect();

    const reels = await Reel.find()
      .sort({ createdAt: -1 })
      .populate({ path: "author", select: "name email avatar", model: User })
      .populate({ path: "approvedBy", select: "name email", model: User })
      .populate({ path: "language", select: "name", model: Language })
      .lean();

    return NextResponse.json({ reels }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || "Failed to fetch reels" },
      { status: 500 }
    );
  } finally {
    await db.disconnect();
  }
}

export async function POST(request: NextRequest) {
  try {
    await db.connect();

    const session = await getSession();
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as typeof session.user & UserType;
    const mongoUser = await User.findOne({ email: user.email });

    if (!mongoUser) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    const body = await request.json();
    const { caption, media, tags, transcription, translation, language } = body;

    if (!caption || !media || !language) {
      return NextResponse.json(
        { message: "Caption, media, and language are required." },
        { status: 400 }
      );
    }

    const newReel = new Reel({
      caption,
      media,
      tags: tags || [],
      transcription,
      translation,
      author: mongoUser._id,
      language,
    });

    await newReel.save();

    return NextResponse.json(
      { message: "Reel created successfully.", reel: newReel },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || "Failed to create reel" },
      { status: 500 }
    );
  } finally {
    await db.disconnect();
  }
}
