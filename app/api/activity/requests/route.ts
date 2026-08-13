//app/api/activity/requests/route.ts
import { auth } from "@/lib/auth";
import "@/models/Language";
import LanguageRoleRequest from "@/models/LanguageRoleRequest";
import "@/models/User";
import db from "@/utils/db";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

type GlobalRole = "user" | "staff" | "admin";

const REQUEST_STATUSES = [
  "pending",
  "approved",
  "rejected",
  "cancelled",
] as const;

const SORT_FIELDS = [
  "createdAt",
  "updatedAt",
  "status",
  "requestedRole",
] as const;

type RequestStatus = (typeof REQUEST_STATUSES)[number];

type SortBy = (typeof SORT_FIELDS)[number];

type SortDirection = "asc" | "desc";

type RequestSummary = {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  cancelled: number;
  actioned: number;
};

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
        {
          error: "You must be signed in.",
        },
        {
          status: 401,
        },
      );
    }

    if (role !== "admin") {
      return NextResponse.json(
        {
          error: "Admin access is required.",
        },
        {
          status: 403,
        },
      );
    }

    await db.connect();

    const { searchParams } = request.nextUrl;

    const requestedStatus = searchParams.get("status") || "pending";

    const rawSortBy = searchParams.get("sortBy") || "createdAt";

    const rawSortDirection =
      searchParams.get("sortDirection") || "desc";

    const status =
      requestedStatus === "all"
        ? "all"
        : isRequestStatus(requestedStatus)
          ? requestedStatus
          : "pending";

    const sortBy: SortBy = isSortBy(rawSortBy)
      ? rawSortBy
      : "createdAt";

    const sortDirection: SortDirection = isSortDirection(
      rawSortDirection,
    )
      ? rawSortDirection
      : "desc";

    const page = parsePositiveInteger(searchParams.get("page"), 1, 100000);

    const limit = parsePositiveInteger(searchParams.get("limit"), 20, 100);

    const query =
      status === "all"
        ? {}
        : {
            status,
          };

    const [total, statusBreakdown, requests] = await Promise.all([
      LanguageRoleRequest.countDocuments(query),

      LanguageRoleRequest.aggregate([
        {
          $group: {
            _id: "$status",
            count: {
              $sum: 1,
            },
          },
        },
      ]),

      LanguageRoleRequest.find(query)
        .populate("user", "name email image")
        .populate("language", "name countries status")
        .populate("reviewedBy", "name email")
        .sort({
          [sortBy]: sortDirection === "asc" ? 1 : -1,
          _id: -1,
        })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
    ]);

    const summary: RequestSummary = {
      total: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
      cancelled: 0,
      actioned: 0,
    };

    for (const item of statusBreakdown) {
      const currentStatus = item._id as RequestStatus;

      if (isRequestStatus(currentStatus)) {
        summary[currentStatus] = item.count;
      }
    }

    summary.total =
      summary.pending +
      summary.approved +
      summary.rejected +
      summary.cancelled;

    summary.actioned =
      summary.approved + summary.rejected + summary.cancelled;

    const totalPages = Math.max(1, Math.ceil(total / limit));

    return NextResponse.json({
      summary,

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

        status: isRequestStatus(roleRequest.status)
          ? roleRequest.status
          : "pending",

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
      {
        error: "Failed to fetch language role requests.",
      },
      {
        status: 500,
      },
    );
  }
}