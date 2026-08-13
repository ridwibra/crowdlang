//api/essay/route.ts

import { NextRequest, NextResponse } from "next/server";
import db from "@/utils/db";
import Essay from "@/models/Essay";
import User from "@/models/User";
import Language from "@/models/Language";
import { getSession } from "@/lib/server";
import { UserType } from "@/utils/types";

export async function GET() {
  try {
    await db.connect();

    const essays = await Essay.find({
      status: "published",
    })
      .populate({ path: "author", select: "name email avatar", model: User })
      .populate({ path: "editedBy", select: "name email", model: User })
      .populate({ path: "approvedBy", select: "name email", model: User })
      .populate({ path: "language", select: "name", model: Language })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ essays }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { message: "Failed to fetch essays." },
      { status: 500 }
    );
  } 
}

export async function POST(request: NextRequest) {
  try {
    await db.connect();

    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { message: "You must be signed in to continue." },
        { status: 401 }
      );
    }

    const user = session.user as typeof session.user & UserType;

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
        { status: 400 }
      );
    }

    const mongoUser = await User.findOne({ email: user.email });
    if (!mongoUser) {
      return NextResponse.json(
        { message: "User not found in database." },
        { status: 404 }
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

    const essay = await Essay.create({
      title,
      category,
      body, // HTML from TipTap
      translationTitle,
      translationBody, // HTML from TipTap
      images: safeImages,
      status: status || "pending",
      level,
      tags: safeTags,
      language,
      author: mongoUser._id,
    });

    return NextResponse.json(
      { message: "Essay created successfully.", essay },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { message: "Failed to create essay." },
      { status: 500 }
    );
  } 
}
