import { NextRequest, NextResponse } from "next/server";
import db from "@/utils/db";
import Reel from "@/models/Reel";
import User from "@/models/User";
import { getSession } from "@/lib/server";
import { Types } from "mongoose";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(
  _request: NextRequest,
  { params }: RouteContext,
) {
  try {
    const { id } = await params;

    await db.connect();

    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 },
      );
    }

    const mongoUser = await User.findOne({
      email: session.user.email,
    });

    if (!mongoUser) {
      return NextResponse.json(
        { message: "User not found" },
        { status: 404 },
      );
    }

    const reel = await Reel.findById(id);

    if (!reel) {
      return NextResponse.json(
        { message: "Reel not found" },
        { status: 404 },
      );
    }

    const alreadyLiked = reel.likes.some((uid: Types.ObjectId) =>
      uid.equals(mongoUser._id),
    );

    if (alreadyLiked) {
      return NextResponse.json(
        { message: "Already liked" },
        { status: 400 },
      );
    }

    reel.likes.push(mongoUser._id);

    await reel.save();

    return NextResponse.json(
      { message: "Liked reel" },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Failed to like reel",
      },
      { status: 500 },
    );
  } finally {
    await db.disconnect();
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: RouteContext,
) {
  try {
    const { id } = await params;

    await db.connect();

    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 },
      );
    }

    const mongoUser = await User.findOne({
      email: session.user.email,
    });

    if (!mongoUser) {
      return NextResponse.json(
        { message: "User not found" },
        { status: 404 },
      );
    }

    const reel = await Reel.findById(id);

    if (!reel) {
      return NextResponse.json(
        { message: "Reel not found" },
        { status: 404 },
      );
    }

    reel.likes = reel.likes.filter(
      (uid: Types.ObjectId) => !uid.equals(mongoUser._id),
    );

    await reel.save();

    return NextResponse.json(
      { message: "Unliked reel" },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Failed to unlike reel",
      },
      { status: 500 },
    );
  } finally {
    await db.disconnect();
  }
}