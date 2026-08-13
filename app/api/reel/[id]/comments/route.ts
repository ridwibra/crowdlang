// /app/api/reel/[id]/comments/route.ts

import { NextRequest, NextResponse } from "next/server";
import db from "@/utils/db";
import Reel from "@/models/Reel";
import User from "@/models/User";
import { getSession } from "@/lib/server";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await db.connect();
    const { id } = await context.params;

    const reel = await Reel.findById(id)
      .populate({
        path: "comments.user",
        select: "name email",
        model: User,
      })
      .lean();

    if (!reel) {
      return NextResponse.json({ message: "Reel not found" }, { status: 404 });
    }

    return NextResponse.json({ comments: reel.comments }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || "Failed to fetch comments" },
      { status: 500 }
    );
  } 
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await db.connect();
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const { text } = await request.json();

    if (!text || text.trim().length === 0) {
      return NextResponse.json(
        { message: "Comment text is required" },
        { status: 400 }
      );
    }

    const mongoUser = await User.findOne({ email: session.user.email });
    const reel = await Reel.findById(id);

    if (!reel) {
      return NextResponse.json({ message: "Reel not found" }, { status: 404 });
    }

    reel.comments.push({
      user: mongoUser._id,
      text,
      likes: [],
      status: "visible",
    });

    await reel.save();

    return NextResponse.json({ message: "Comment added" }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || "Failed to add comment" },
      { status: 500 }
    );
  } 
}
