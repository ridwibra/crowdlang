//app/api/activity/requests/[requestId]/route.ts

import { auth } from "@/lib/auth";
import "@/models/Language";
import LanguageRoleRequest from "@/models/LanguageRoleRequest";
import "@/models/User";
import db from "@/utils/db";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

type GlobalRole = "user" | "staff" | "admin";
type RequestStatus = "pending" | "approved" | "rejected" | "cancelled";
type SortBy = "createdAt" | "updatedAt" | "status" | "requestedRole";
type SortDirection = "asc" | "desc";

const REQUEST_STATUSES: RequestStatus[] = [
  "pending",
  "approved",
  "rejected",
  "cancelled",
];

const SORT_FIELDS: SortBy[] = [
  "createdAt",
  "updatedAt",
  "status",
  "requestedRole",
];

function parsePositiveInteger(
  value: string | null,
  fallback: number,
  maximum: number,
) {
  const parsed = Number.parseInt(value || "", 10);

  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }

  return Math.min(parsed, maximum);
}

function isRequestStatus(value: string): value is RequestStatus {
  return REQUEST_STATUSES.includes(value as RequestStatus);
}

function isSortBy(value: string): value is SortBy {
  return SORT_FIELDS.includes(value as SortBy);
}

function isSortDirection(value: string): value is SortDirection {
  return value === "asc" || value === "desc";
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    const role = (session?.user as { role?: GlobalRole } | undefined)?.role;

    if (!session?.user) {
      return NextResponse.json(
        { error: "You must be signed in." },
        { status: 401 },
      );
    }

    if (role !== "admin") {
      return NextResponse.json(
        { error: "Admin access is required." },
        { status: 403 },
      );
    }

    await db.connect();

    const { searchParams } = request.nextUrl;

    const requestedStatus = searchParams.get("status") || "pending";
    const rawSortBy = searchParams.get("sortBy") || "createdAt";
    const rawSortDirection = searchParams.get("sortDirection") || "desc";

    const page = parsePositiveInteger(searchParams.get("page"), 1, 100000);
    const limit = parsePositiveInteger(searchParams.get("limit"), 20, 100);

    const status =
      requestedStatus === "all"
        ? "all"
        : isRequestStatus(requestedStatus)
          ? requestedStatus
          : "pending";

    const sortBy: SortBy = isSortBy(rawSortBy) ? rawSortBy : "createdAt";

    const sortDirection: SortDirection = isSortDirection(rawSortDirection)
      ? rawSortDirection
      : "desc";

    const query = status === "all" ? {} : { status };

    const total = await LanguageRoleRequest.countDocuments(query);
    const totalPages = Math.max(1, Math.ceil(total / limit));

    const requests = await LanguageRoleRequest.find(query)
      .populate("user", "name email image")
      .populate("language", "name countries status")
      .populate("reviewedBy", "name email")
      .sort({
        [sortBy]: sortDirection === "asc" ? 1 : -1,
        _id: -1,
      })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return NextResponse.json({
      requests: requests.map((roleRequest: any) => ({
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
        status: roleRequest.status || "pending",

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
      })),

      pagination: {
        page,
        limit,
        total,
        totalPages,
        sortBy,
        sortDirection,
      },
    });
  } catch (error) {
    console.error("GET /api/activity/requests error:", error);

    return NextResponse.json(
      { error: "Failed to fetch language role requests." },
      { status: 500 },
    );
  }
}