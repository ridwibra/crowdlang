// app/api/reel/[id]/comments/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import db from "@/utils/db";
import Reel from "@/models/Reel";
import User from "@/models/User";
import { getSession } from "@/lib/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function serializeDate(value: unknown): string {
  if (!value) return "";

  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

function serializeComments(comments: any[] = []) {
  return comments
    .filter(
      (comment) =>
        !comment.status || comment.status === "visible",
    )
    .sort(
      (first, second) =>
        new Date(second.createdAt).getTime() -
        new Date(first.createdAt).getTime(),
    )
    .map((comment) => ({
      _id: comment._id.toString(),
      text: comment.text || "",
      user: comment.user
        ? {
            _id:
              comment.user._id?.toString() ??
              String(comment.user),
            name: comment.user.name || "Unknown contributor",
            avatar:
              comment.user.avatar?.image_url ||
              comment.user.image ||
              null,
          }
        : {
            _id: "",
            name: "Unknown contributor",
            avatar: null,
          },
      likes: (comment.likes ?? []).map(String),
      createdAt: serializeDate(comment.createdAt),
      updatedAt: serializeDate(comment.updatedAt),
    }));
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

    const reel = await Reel.findById(id)
      .select("comments")
      .populate({
        path: "comments.user",
        select: "name avatar image",
        model: User,
      })
      .lean();

    if (!reel) {
      return NextResponse.json(
        { message: "Reel not found." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      comments: serializeComments(reel.comments),
    });
  } catch (error) {
    console.error("GET /api/reel/[id]/comments error:", error);

    return NextResponse.json(
      { message: "Failed to fetch comments." },
      { status: 500 },
    );
  }
}

export async function POST(
  request: NextRequest,
  context: RouteContext,
) {
  try {
    const session = await getSession();

    if (!session?.user?.email) {
      return NextResponse.json(
        { message: "Please sign in to add a comment." },
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

    const reel = await Reel.findByIdAndUpdate(
      id,
      {
        $push: {
          comments: {
            user: mongoUser._id,
            text: body.text.trim(),
            likes: [],
            dislikes: [],
            status: "visible",
          },
        },
      },
      {
        new: true,
        runValidators: true,
      },
    )
      .select("comments")
      .populate({
        path: "comments.user",
        select: "name avatar image",
        model: User,
      })
      .lean();

    if (!reel) {
      return NextResponse.json(
        { message: "Reel not found." },
        { status: 404 },
      );
    }

    return NextResponse.json(
      {
        message: "Comment added successfully.",
        comments: serializeComments(reel.comments),
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("POST /api/reel/[id]/comments error:", error);

    return NextResponse.json(
      { message: "Failed to add comment." },
      { status: 500 },
    );
  }
}