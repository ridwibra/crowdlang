// app/api/essayapprove/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import db from "@/utils/db";
import Essay from "@/models/Essay";
import User from "@/models/User";
import Language from "@/models/Language";
import { getSession } from "@/lib/server";

const ALLOWED_STATUSES = [
  "draft",
  "pending",
  "approved",
  "published",
  "rejected",
] as const;

type EssayStatus = (typeof ALLOWED_STATUSES)[number];

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext,
) {
  const { id } = await context.params;

  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        {
          message: "Invalid essay ID.",
        },
        {
          status: 400,
        },
      );
    }

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
    });

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
            "Only staff and administrators can change essay status.",
        },
        {
          status: 403,
        },
      );
    }

    const body = await request.json();

    const status = String(body.status || "").toLowerCase();

    const comment = String(body.comment || "")
      .trim()
      .slice(0, 2000);

    if (!ALLOWED_STATUSES.includes(status as EssayStatus)) {
      return NextResponse.json(
        {
          message:
           "Status must be draft, pending, approved, published, or rejected.",
        },
        {
          status: 400,
        },
      );
    }

    if (status === "rejected" && !comment) {
      return NextResponse.json(
        {
          message:
            "A moderation comment is required when rejecting an essay.",
        },
        {
          status: 400,
        },
      );
    }

    const existingEssay = await Essay.findById(id);

    if (!existingEssay) {
      return NextResponse.json(
        {
          message: "Essay not found.",
        },
        {
          status: 404,
        },
      );
    }

    const previousStatus = existingEssay.status as EssayStatus;

    const update: Record<string, unknown> = {
      status,

      $push: {
        moderationHistory: {
          previousStatus,
          nextStatus: status,
          comment,
          changedBy: mongoUser._id,
          changedAt: new Date(),
        },
      },
    };

   update.$addToSet = {
  approvedBy: mongoUser._id,
};

    const essay = await Essay.findByIdAndUpdate(id, update, {
      new: true,
      runValidators: true,
    })
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
      .populate({
        path: "moderationHistory.changedBy",
        select: "name email",
        model: User,
      })
      .lean();

    return NextResponse.json(
      {
        message: `Essay status changed to ${status}.`,
        essay,
      },
      {
        status: 200,
      },
    );
  } catch (error) {
    console.error("Essay approval PATCH error:", error);

    return NextResponse.json(
      {
        message: "Failed to update essay status.",
      },
      {
        status: 500,
      },
    );
  }
}

export async function GET(
  _request: NextRequest,
  context: RouteContext,
) {
  const { id } = await context.params;

  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        {
          message: "Invalid essay ID.",
        },
        {
          status: 400,
        },
      );
    }

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

    const isStaffOrAdmin =
      mongoUser?.role === "staff" || mongoUser?.role === "admin";

    if (!isStaffOrAdmin) {
      return NextResponse.json(
        {
          message:
            "Only staff and administrators can view this essay.",
        },
        {
          status: 403,
        },
      );
    }

    const essay = await Essay.findById(id)
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
      .populate({
        path: "moderationHistory.changedBy",
        select: "name email",
        model: User,
      })
      .lean();

    if (!essay) {
      return NextResponse.json(
        {
          message: "Essay not found.",
        },
        {
          status: 404,
        },
      );
    }

    return NextResponse.json(
      {
        essay,
      },
      {
        status: 200,
      },
    );
  } catch (error) {
    console.error("Essay approval GET error:", error);

    return NextResponse.json(
      {
        message: "Failed to fetch essay.",
      },
      {
        status: 500,
      },
    );
  }
}