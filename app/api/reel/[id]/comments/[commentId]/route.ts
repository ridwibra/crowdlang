// /app/api/reel/[id]/comments/[commentId]/route.ts

import { NextRequest, NextResponse } from "next/server";
import db from "@/utils/db";
import Reel from "@/models/Reel";
import { getSession } from "@/lib/server";
import { Types } from "mongoose";

export async function PUT(
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
    const { text } = await request.json();

    const reel = await Reel.findById(id);
    if (!reel) {
      return NextResponse.json({ message: "Reel not found" }, { status: 404 });
    }

    const comment = reel.comments.id(commentId);
    if (!comment) {
      return NextResponse.json({ message: "Comment not found" }, { status: 404 });
    }

    comment.text = text;
    await reel.save();

    return NextResponse.json({ message: "Comment updated" });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || "Failed to update comment" },
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

    const reel = await Reel.findById(id);
    if (!reel) {
      return NextResponse.json({ message: "Reel not found" }, { status: 404 });
    }

    reel.comments = reel.comments.filter(
      (c: { _id: Types.ObjectId }) => !c._id.equals(commentId)
    );

    await reel.save();

    return NextResponse.json({ message: "Comment deleted" });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || "Failed to delete comment" },
      { status: 500 }
    );
  } 
}

