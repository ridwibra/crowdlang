// /app/api/reel/[id]/comments/[commentId]/like/route.ts
import { NextRequest, NextResponse } from "next/server";
import db from "@/utils/db";
import Reel from "@/models/Reel";
import User from "@/models/User";
import { getSession } from "@/lib/server";
import { Types } from "mongoose";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string; commentId: string }> }
) {
  try {
    await db.connect();
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id, commentId } = await context.params;
    const mongoUser = await User.findOne({ email: session.user.email });

    const reel = await Reel.findById(id);
    if (!reel) {
      return NextResponse.json({ message: "Reel not found" }, { status: 404 });
    }

    const comment = reel.comments.id(commentId);
    if (!comment) {
      return NextResponse.json({ message: "Comment not found" }, { status: 404 });
    }

    if (!comment.likes.includes(mongoUser._id)) {
      comment.likes.push(mongoUser._id);
      await reel.save();
    }

    return NextResponse.json({ message: "Liked comment" });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || "Failed to like comment" },
      { status: 500 }
    );
  } 
}
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string; commentId: string }> }
) {
  try {
    await db.connect();
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id, commentId } = await context.params;
    const mongoUser = await User.findOne({ email: session.user.email });

    const reel = await Reel.findById(id);
    if (!reel) {
      return NextResponse.json({ message: "Reel not found" }, { status: 404 });
    }

    const comment = reel.comments.id(commentId);
    if (!comment) {
      return NextResponse.json({ message: "Comment not found" }, { status: 404 });
    }

    comment.likes = comment.likes.filter(
      (uid: Types.ObjectId) => !uid.equals(mongoUser._id)
    );

    await reel.save();

    return NextResponse.json({ message: "Unliked comment" });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || "Failed to unlike comment" },
      { status: 500 }
    );
  }
}

