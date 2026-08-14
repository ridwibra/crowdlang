//app/api/activity/requests/[requestId]/route.ts
import { auth } from "@/lib/auth";
import "@/models/Language";
import LanguageRoleRequest from "@/models/LanguageRoleRequest";
import User from "@/models/User";
import db from "@/utils/db";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

type GlobalRole = "user" | "staff" | "admin";

type RequestStatus = "pending" | "approved" | "rejected" | "cancelled";

type RouteContext = {
  params: Promise<{
    requestId: string;
  }>;
};

function serializeRequest(roleRequest: any) {
  return {
    _id: roleRequest._id.toString(),

    user: roleRequest.user
      ? {
          _id: roleRequest.user._id.toString(),
          name: roleRequest.user.name || "Unknown user",
          email: roleRequest.user.email || "",
          image: roleRequest.user.image || null,
        }
      : null,

    language: roleRequest.language
      ? {
          _id: roleRequest.language._id.toString(),
          name: roleRequest.language.name || "Unknown language",
          countries: Array.isArray(roleRequest.language.countries)
            ? roleRequest.language.countries
            : [],
          status:
            roleRequest.language.status === "archived"
              ? "archived"
              : "active",
        }
      : null,

    currentRole:
      roleRequest.currentRole === "expert"
        ? "expert"
        : roleRequest.currentRole === "editor"
          ? "editor"
          : "user",

    requestedRole:
      roleRequest.requestedRole === "expert" ? "expert" : "editor",

    justification: roleRequest.justification || "",

    status: roleRequest.status as RequestStatus,

    reviewedBy: roleRequest.reviewedBy
      ? {
          _id: roleRequest.reviewedBy._id.toString(),
          name: roleRequest.reviewedBy.name || "Unknown admin",
          email: roleRequest.reviewedBy.email || "",
        }
      : null,

    reviewedAt: roleRequest.reviewedAt
      ? new Date(roleRequest.reviewedAt).toISOString()
      : null,

    reviewNote: roleRequest.reviewNote || "",

    createdAt: roleRequest.createdAt
      ? new Date(roleRequest.createdAt).toISOString()
      : new Date().toISOString(),

    updatedAt: roleRequest.updatedAt
      ? new Date(roleRequest.updatedAt).toISOString()
      : new Date().toISOString(),
  };
}

async function requireAdmin() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const role = (session?.user as { role?: GlobalRole } | undefined)?.role;

  if (!session?.user) {
    return {
      error: NextResponse.json(
        { error: "You must be signed in." },
        { status: 401 },
      ),
    };
  }

  if (role !== "admin") {
    return {
      error: NextResponse.json(
        { error: "Admin access is required." },
        { status: 403 },
      ),
    };
  }

  return {
    user: session.user,
  };
}

export async function GET(
  _: NextRequest,
  { params }: RouteContext,
) {
  try {
    const access = await requireAdmin();

    if (access.error) {
      return access.error;
    }

    const { requestId } = await params;

    if (!mongoose.Types.ObjectId.isValid(requestId)) {
      return NextResponse.json(
        { error: "Invalid role request ID." },
        { status: 400 },
      );
    }

    await db.connect();

    const roleRequest = await LanguageRoleRequest.findById(requestId)
      .populate("user", "name email image")
      .populate("language", "name countries status")
      .populate("reviewedBy", "name email")
      .lean();

    if (!roleRequest) {
      return NextResponse.json(
        { error: "Language role request not found." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      request: serializeRequest(roleRequest),
    });
  } catch (error) {
    console.error("GET /api/activity/requests/[requestId] error:", error);

    return NextResponse.json(
      { error: "Failed to fetch the language role request." },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: RouteContext,
) {
  try {
    const access = await requireAdmin();

    if (access.error) {
      return access.error;
    }

    const { requestId } = await params;

    if (!mongoose.Types.ObjectId.isValid(requestId)) {
      return NextResponse.json(
        { error: "Invalid role request ID." },
        { status: 400 },
      );
    }

    const body = await request.json();

    const action = body?.action;
    const reviewNote =
      typeof body?.reviewNote === "string" ? body.reviewNote.trim() : "";

    if (action !== "approved" && action !== "rejected") {
      return NextResponse.json(
        { error: 'Action must be either "approved" or "rejected".' },
        { status: 400 },
      );
    }

    if (reviewNote.length > 2000) {
      return NextResponse.json(
        { error: "Review note cannot exceed 2000 characters." },
        { status: 400 },
      );
    }

    await db.connect();

    const roleRequest = await LanguageRoleRequest.findById(requestId);

    if (!roleRequest) {
      return NextResponse.json(
        { error: "Language role request not found." },
        { status: 404 },
      );
    }

    if (roleRequest.status !== "pending") {
      return NextResponse.json(
        { error: "Only pending requests can be reviewed." },
        { status: 409 },
      );
    }

    roleRequest.status = action;
    roleRequest.reviewedBy = access.user.id;
    roleRequest.reviewedAt = new Date();
    roleRequest.reviewNote = reviewNote;

    await roleRequest.save();

    if (action === "approved") {
      const userUpdate = await User.updateOne(
        {
          _id: roleRequest.user,
        },
        {
          $set: {
            [`languageRoles.${roleRequest.language.toString()}`]:
              roleRequest.requestedRole,
          },
        },
      );

      if (userUpdate.matchedCount === 0) {
        return NextResponse.json(
          {
            error:
              "The request was reviewed, but the requesting user no longer exists.",
          },
          { status: 409 },
        );
      }
    }

    const updatedRequest = await LanguageRoleRequest.findById(requestId)
      .populate("user", "name email image")
      .populate("language", "name countries status")
      .populate("reviewedBy", "name email")
      .lean();

    return NextResponse.json({
      message:
        action === "approved"
          ? "Language role request approved."
          : "Language role request rejected.",
      request: updatedRequest ? serializeRequest(updatedRequest) : null,
    });
  } catch (error) {
    console.error("PATCH /api/activity/requests/[requestId] error:", error);

    return NextResponse.json(
      { error: "Failed to review the language role request." },
      { status: 500 },
    );
  }
}