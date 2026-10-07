import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import db from "@/utils/db";
import Language from "@/models/Language";

const NORMAL_STATUSES = ["active", "archived"] as const;

type NormalStatus = (typeof NORMAL_STATUSES)[number];

type StatusRequestBody = {
  status?: string;
  action?: "approve_deletion" | "refuse_deletion";
};

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await db.connect();

    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json(
        { error: "You must be signed in." },
        { status: 401 },
      );
    }

    if (session.user.role !== "admin") {
      return NextResponse.json(
        { error: "Global admin access is required." },
        { status: 403 },
      );
    }

    const { id } = await context.params;
    const body = (await request.json()) as StatusRequestBody;

    const action = body.action;
    const requestedStatus = body.status;

    if (action && requestedStatus) {
      return NextResponse.json(
        {
          error:
            "Send either an action or a status, not both in the same request.",
        },
        { status: 400 },
      );
    }

    const isDeletionDecision =
      action === "approve_deletion" || action === "refuse_deletion";

    const isNormalStatusUpdate = NORMAL_STATUSES.includes(
      requestedStatus as NormalStatus,
    );

    if (!isDeletionDecision && !isNormalStatusUpdate) {
      return NextResponse.json(
        {
          error:
            'Send status "active" or "archived", or action "approve_deletion" or "refuse_deletion".',
        },
        { status: 400 },
      );
    }

    const language = await Language.findById(id);

    if (!language) {
      return NextResponse.json(
        { error: "Language not found." },
        { status: 404 },
      );
    }

    if (action === "approve_deletion") {
      if (
        language.status !== "pending_deletion" ||
        !language.deletionRequest?.requestedBy
      ) {
        return NextResponse.json(
          { error: "This language does not have a pending deletion request." },
          { status: 409 },
        );
      }

      const archivedLanguage = await Language.findOneAndUpdate(
        {
          _id: language._id,
          status: "pending_deletion",
          "deletionRequest.requestedBy":
            language.deletionRequest.requestedBy,
        },
        {
          $set: {
            status: "archived",
          },
          $unset: {
            deletionRequest: 1,
          },
        },
        {
          new: true,
          runValidators: true,
        },
      ).lean();

      if (!archivedLanguage) {
        return NextResponse.json(
          {
            error:
              "The deletion request was already handled or changed. Refresh and try again.",
          },
          { status: 409 },
        );
      }

      return NextResponse.json(
        {
          message:
            "Language deletion request approved. The language was archived and removed from public lists.",
          language: {
            _id: archivedLanguage._id.toString(),
            name: archivedLanguage.name,
            status: archivedLanguage.status,
          },
        },
        { status: 200 },
      );
    }

    if (action === "refuse_deletion") {
      const previousStatus = language.deletionRequest?.previousStatus;

      if (
        language.status !== "pending_deletion" ||
        (previousStatus !== "active" && previousStatus !== "archived")
      ) {
        return NextResponse.json(
          { error: "This language does not have a pending deletion request." },
          { status: 409 },
        );
      }

      const restoredLanguage = await Language.findOneAndUpdate(
        {
          _id: language._id,
          status: "pending_deletion",
          "deletionRequest.previousStatus": previousStatus,
        },
        {
          $set: {
            status: previousStatus,
          },
          $unset: {
            deletionRequest: 1,
          },
        },
        {
          new: true,
          runValidators: true,
        },
      ).lean();

      if (!restoredLanguage) {
        return NextResponse.json(
          {
            error:
              "The deletion request was already handled or changed. Refresh and try again.",
          },
          { status: 409 },
        );
      }

      return NextResponse.json(
        {
          message: `Language deletion request refused. The language was restored to "${previousStatus}".`,
          language: {
            _id: restoredLanguage._id.toString(),
            name: restoredLanguage.name,
            status: restoredLanguage.status,
          },
        },
        { status: 200 },
      );
    }

    if (language.status === "pending_deletion") {
      return NextResponse.json(
        {
          error:
            "This language is pending deletion. Approve or refuse the deletion request before changing its status.",
        },
        { status: 409 },
      );
    }

    const updatedLanguage = await Language.findOneAndUpdate(
      {
        _id: language._id,
        status: { $in: ["active", "archived"] },
      },
      {
        $set: {
          status: requestedStatus as NormalStatus,
        },
      },
      {
        new: true,
        runValidators: true,
      },
    ).lean();

    if (!updatedLanguage) {
      return NextResponse.json(
        {
          error:
            "The language status changed before this update could be saved. Refresh and try again.",
        },
        { status: 409 },
      );
    }

    return NextResponse.json(
      {
        message: "Language status updated.",
        language: {
          _id: updatedLanguage._id.toString(),
          name: updatedLanguage.name,
          status: updatedLanguage.status,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("PATCH /api/languages/[id]/status error:", error);

    return NextResponse.json(
      { error: "Failed to update language status." },
      { status: 500 },
    );
  }
}