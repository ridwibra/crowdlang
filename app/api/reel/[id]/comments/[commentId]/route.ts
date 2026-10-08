// app/api/reel/[id]/comments/[commentId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import db from "@/utils/db";
import Reel from "@/models/Reel";
import User from "@/models/User";
import { getSession } from "@/lib/server";

type RouteContext = {
  params: Promise<{
    id: string;
    commentId: string;
  }>;
};

async function authorizeComment(
  reelId: string,
  commentId: string,
  email: string,
) {
  const mongoUser = await User.findOne({ email }).select("_id role");

  if (!mongoUser) {
    return NextResponse.json(
      { message: "User not found in database." },
      { status: 404 },
    );
  }

  const reel = await Reel.findById(reelId).select("comments").lean();

  if (!reel) {
    return NextResponse.json(
      { message: "Reel not found." },
      { status: 404 },
    );
  }

  const comment = reel.comments.find(
    (item: { _id: Types.ObjectId }) =>
      item._id.toString() === commentId,
  );

  if (!comment) {
    return NextResponse.json(
      { message: "Comment not found." },
      { status: 404 },
    );
  }

  const isPrivileged =
    mongoUser.role === "admin" || mongoUser.role === "root";

  const isCommentAuthor =
    comment.user != null &&
    comment.user.toString() === mongoUser._id.toString();

  if (!isCommentAuthor && !isPrivileged) {
    return NextResponse.json(
      {
        message:
          "Only this comment's author, an admin, or root can edit or delete it.",
      },
      { status: 403 },
    );
  }

  return null;
}

export async function PUT(
  request: NextRequest,
  context: RouteContext,
) {
  try {
    const session = await getSession();

    if (!session?.user?.email) {
      return NextResponse.json(
        { message: "Please sign in to edit a comment." },
        { status: 401 },
      );
    }

    const { id, commentId } = await context.params;

    if (
      !Types.ObjectId.isValid(id) ||
      !Types.ObjectId.isValid(commentId)
    ) {
      return NextResponse.json(
        { message: "Invalid reel or comment ID." },
        { status: 400 },
      );
    }

    await db.connect();

    const authorizationError = await authorizeComment(
      id,
      commentId,
      session.user.email,
    );

    if (authorizationError) {
      return authorizationError;
    }

    const body = await request.json().catch(() => null);

    if (
      !body ||
      typeof body.text !== "string" ||
      !body.text.trim()
    ) {
      return NextResponse.json(
        { message: "Comment text is required." },
        { status: 400 },
      );
    }

    const text = body.text.trim();

    const result = await Reel.updateOne(
      {
        _id: id,
        "comments._id": new Types.ObjectId(commentId),
      },
      {
        $set: {
          "comments.$.text": text,
          "comments.$.updatedAt": new Date(),
        },
      },
      { runValidators: true },
    );

    if (!result.matchedCount) {
      return NextResponse.json(
        { message: "Reel or comment no longer exists." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      message: "Comment updated successfully.",
      comment: {
        _id: commentId,
        text,
      },
    });
  } catch (error) {
    console.error(
      "PUT /api/reel/[id]/comments/[commentId] error:",
      error,
    );

    return NextResponse.json(
      { message: "Failed to update comment." },
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
        { message: "Please sign in to delete a comment." },
        { status: 401 },
      );
    }

    const { id, commentId } = await context.params;

    if (
      !Types.ObjectId.isValid(id) ||
      !Types.ObjectId.isValid(commentId)
    ) {
      return NextResponse.json(
        { message: "Invalid reel or comment ID." },
        { status: 400 },
      );
    }

    await db.connect();

    const authorizationError = await authorizeComment(
      id,
      commentId,
      session.user.email,
    );

    if (authorizationError) {
      return authorizationError;
    }

    const result = await Reel.updateOne(
      {
        _id: id,
        "comments._id": new Types.ObjectId(commentId),
      },
      {
        $pull: {
          comments: {
            _id: new Types.ObjectId(commentId),
          },
        },
      },
    );

    if (!result.matchedCount) {
      return NextResponse.json(
        { message: "Reel or comment no longer exists." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      message: "Comment deleted successfully.",
      deletedCommentId: commentId,
    });
  } catch (error) {
    console.error(
      "DELETE /api/reel/[id]/comments/[commentId] error:",
      error,
    );

    return NextResponse.json(
      { message: "Failed to delete comment." },
      { status: 500 },
    );
  }
}