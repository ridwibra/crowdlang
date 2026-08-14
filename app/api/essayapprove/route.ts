// app/api/essayapprove/route.ts
import { NextResponse } from "next/server";
import db from "@/utils/db";
import Essay from "@/models/Essay";
import User from "@/models/User";
import Language from "@/models/Language";
import { getSession } from "@/lib/server";

export async function GET() {
  try {
    await db.connect();

    const session = await getSession();

    if (!session?.user?.email) {
      return NextResponse.json(
        {
          message: "You must be signed in to continue.",
        },
        {
          status: 401,
        },
      );
    }

    const mongoUser = await User.findOne({
      email: session.user.email,
    }).lean();

    if (!mongoUser) {
      return NextResponse.json(
        {
          message: "User not found.",
        },
        {
          status: 404,
        },
      );
    }

    const isStaffOrAdmin =
      mongoUser.role === "staff" || mongoUser.role === "admin";

    if (!isStaffOrAdmin) {
      return NextResponse.json(
        {
          message:
            "Only staff and administrators can view all essays.",
        },
        {
          status: 403,
        },
      );
    }

    const essays = await Essay.find()
      .populate({
        path: "author",
        select: "name email avatar",
        model: User,
      })
      .populate({
        path: "editedBy",
        select: "name email",
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
      .sort({
        createdAt: -1,
        _id: -1,
      })
      .lean();

    return NextResponse.json(
      {
        essays,
      },
      {
        status: 200,
      },
    );
  } catch (error) {
    console.error("Essay approval GET error:", error);

    return NextResponse.json(
      {
        message: "Failed to fetch essays.",
      },
      {
        status: 500,
      },
    );
  }
}