"use client";

import { authClient } from "@/lib/auth-client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { User } from "lucide-react";
import { toast } from "sonner";

type RequestStatus = "pending" | "approved" | "rejected" | "cancelled";
type SortBy = "createdAt" | "updatedAt" | "status" | "requestedRole";
type SortDirection = "asc" | "desc";

type RoleRequest = {
  _id: string;
  user: {
    _id: string;
    name: string;
    email: string;
    image: string | null;
  } | null;
  language: {
    _id: string;
    name: string;
    countries: string[];
    status: "active" | "archived";
  } | null;
  currentRole: "user" | "editor" | "expert";
  requestedRole: "editor" | "expert";
  justification: string;
  status: RequestStatus;
  reviewedBy: {
    _id: string;
    name: string;
    email: string;
  } | null;
  reviewedAt: string | null;
  reviewNote: string;
  createdAt: string;
  updatedAt: string;
};

type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  sortBy?: SortBy;
  sortDirection?: SortDirection;
};

const STATUS_OPTIONS: Array<RequestStatus | "all"> = [
  "pending",
  "approved",
  "rejected",
  "cancelled",
  "all",
];

const SORT_OPTIONS: Array<{
  label: string;
  sortBy: SortBy;
  sortDirection: SortDirection;
}> = [
  {
    label: "Newest first",
    sortBy: "createdAt",
    sortDirection: "desc",
  },
  {
    label: "Oldest first",
    sortBy: "createdAt",
    sortDirection: "asc",
  },
  {
    label: "Recently updated",
    sortBy: "updatedAt",
    sortDirection: "desc",
  },
  {
    label: "Status: A to Z",
    sortBy: "status",
    sortDirection: "asc",
  },
  {
    label: "Status: Z to A",
    sortBy: "status",
    sortDirection: "desc",
  },
  {
    label: "Requested role: A to Z",
    sortBy: "requestedRole",
    sortDirection: "asc",
  },
  {
    label: "Requested role: Z to A",
    sortBy: "requestedRole",
    sortDirection: "desc",
  },
];

function formatDate(value: string | null) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "numeric",
  });
}

function getStatusClass(status: RequestStatus) {
  if (status === "approved") {
    return "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-300";
  }

  if (status === "rejected") {
    return "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300";
  }

  if (status === "cancelled") {
    return "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300";
  }

  return "bg-yellow-100 text-yellow-700 dark:bg-yellow-950/50 dark:text-yellow-300";
}

function getRoleClass(role: "user" | "editor" | "expert") {
  if (role === "expert") {
    return "bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300";
  }

  if (role === "editor") {
    return "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300";
  }

  return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
}

export default function AdminLanguageRoleRequestsPage() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();

  const globalRole = (session?.user as { role?: string } | undefined)?.role;
  const isAdmin = globalRole === "admin";

  const [requests, setRequests] = useState<RoleRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedStatus, setSelectedStatus] = useState<RequestStatus | "all">(
    "pending",
  );

  const [sortBy, setSortBy] = useState<SortBy>("createdAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  const [expandedRequestId, setExpandedRequestId] = useState<string | null>(
    null,
  );

  const [reviewNote, setReviewNote] = useState("");
  const [reviewingId, setReviewingId] = useState<string | null>(null);

  useEffect(() => {
    if (isPending) return;

    if (!session || !isAdmin) {
      router.replace("/unauthorized");
    }
  }, [isPending, session, isAdmin, router]);

  const loadRequests = async (page = 1) => {
    try {
      setLoading(true);

      const params = new URLSearchParams({
        status: selectedStatus,
        sortBy,
        sortDirection,
        page: String(page),
        limit: "20",
      });

      const response = await fetch(
        `/api/activity/requests?${params.toString()}`,
        {
          cache: "no-store",
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load role requests.");
      }

      setRequests(data.requests || []);

      setPagination(
        data.pagination || {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0,
        },
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to load role requests.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isPending || !session || !isAdmin) return;

    setExpandedRequestId(null);
    setReviewNote("");
    loadRequests(1);
  }, [selectedStatus, sortBy, sortDirection, isPending, session, isAdmin]);

  const reviewRequest = async (
    requestId: string,
    action: "approved" | "rejected",
  ) => {
    setReviewingId(requestId);

    try {
      const response = await fetch(`/api/activity/requests/${requestId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action,
          reviewNote: reviewNote.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to review request.");
      }

      toast.success(data.message || "Request reviewed successfully.");

      setExpandedRequestId(null);
      setReviewNote("");

      await loadRequests(pagination.page);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to review request.",
      );
    } finally {
      setReviewingId(null);
    }
  };

  if (isPending || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center pt-24">
        <div className="flex items-center gap-3 rounded-xl border px-6 py-4">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-teal-500 border-t-transparent" />
          <span className="text-sm font-medium">Loading role requests...</span>
        </div>
      </div>
    );
  }

  if (!session || !isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen px-4 py-6 pt-24 dark:bg-neutral-950">
      <div className="mx-auto max-w-7xl rounded-3xl border bg-white/80 p-6 shadow-sm backdrop-blur dark:border-neutral-800 dark:bg-neutral-900/80 sm:p-8">
        <div className="mb-8 space-y-6">
          <div>
            <Link
              href="/admin"
              className="inline-flex items-center gap-2 text-sm font-medium text-teal-600 hover:text-teal-700 dark:text-teal-400 dark:hover:text-teal-300"
            >
              ← Back to Admin
            </Link>

            <p className="mt-3 text-sm font-semibold uppercase tracking-[0.2em] text-teal-600 dark:text-teal-400">
              Admin Panel
            </p>

            <h1 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">
              Language Role Requests
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
              Review and sort editor or expert language role requests.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-neutral-700 dark:bg-neutral-800/60 sm:p-5">
            <div className="mb-4">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Filter and Sort
              </h2>

              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Choose which requests to display and how they are ordered.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="min-w-0">
                <label
                  htmlFor="request-status"
                  className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300"
                >
                  Request Status
                </label>

                <select
                  id="request-status"
                  value={selectedStatus}
                  onChange={(event) =>
                    setSelectedStatus(
                      event.target.value as RequestStatus | "all",
                    )
                  }
                  className="h-12 w-full appearance-none rounded-xl border border-slate-300 bg-white px-4 text-sm font-medium capitalize text-slate-800 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/30 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
                >
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {status === "all" ? "All requests" : `${status} requests`}
                    </option>
                  ))}
                </select>
              </div>

              <div className="min-w-0">
                <label
                  htmlFor="request-sort"
                  className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300"
                >
                  Sort Requests
                </label>

                <select
                  id="request-sort"
                  value={`${sortBy}-${sortDirection}`}
                  onChange={(event) => {
                    const [nextSortBy, nextSortDirection] =
                      event.target.value.split("-") as [SortBy, SortDirection];

                    setSortBy(nextSortBy);
                    setSortDirection(nextSortDirection);
                  }}
                  className="h-12 w-full appearance-none rounded-xl border border-slate-300 bg-white px-4 text-sm font-medium text-slate-800 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/30 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
                >
                  {SORT_OPTIONS.map((option) => (
                    <option
                      key={`${option.sortBy}-${option.sortDirection}`}
                      value={`${option.sortBy}-${option.sortDirection}`}
                    >
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        <p className="mb-4 text-sm text-slate-600 dark:text-slate-300">
          {pagination.total} request{pagination.total === 1 ? "" : "s"} found.
        </p>

        <div className="space-y-4">
          {requests.length === 0 ? (
            <div className="rounded-2xl border bg-white px-6 py-12 text-center text-sm text-slate-600 dark:border-neutral-700 dark:bg-neutral-900 dark:text-slate-300">
              No {selectedStatus === "all" ? "" : selectedStatus} requests
              found.
            </div>
          ) : (
            requests.map((request) => {
              const isExpanded = expandedRequestId === request._id;
              const isPendingRequest = request.status === "pending";
              const isReviewing = reviewingId === request._id;

              return (
                <div
                  key={request._id}
                  className="overflow-hidden rounded-2xl border bg-white shadow-sm dark:border-neutral-700 dark:bg-neutral-900"
                >
                  <button
                    type="button"
                    onClick={() => {
                      setExpandedRequestId(isExpanded ? null : request._id);

                      setReviewNote(isExpanded ? "" : request.reviewNote || "");
                    }}
                    className="grid w-full grid-cols-1 gap-4 px-5 py-5 text-left transition hover:bg-slate-50 dark:hover:bg-neutral-800 md:grid-cols-[2fr_1.4fr_1fr_1fr_auto]"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-200 dark:bg-neutral-700">
                        {request.user?.image ? (
                          <img
                            src={request.user.image}
                            alt={request.user.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <User className="h-5 w-5 text-slate-600 dark:text-slate-300" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <p className="truncate font-semibold text-slate-900 dark:text-white">
                          {request.user?.name || "Deleted user"}
                        </p>

                        <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                          {request.user?.email || "No email"}
                        </p>
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Language
                      </p>

                      <p className="mt-1 font-medium text-slate-800 dark:text-slate-100">
                        {request.language?.name || "Deleted language"}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Requested Role
                      </p>

                      <span
                        className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${getRoleClass(
                          request.requestedRole,
                        )}`}
                      >
                        {request.requestedRole}
                      </span>
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Status
                      </p>

                      <span
                        className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${getStatusClass(
                          request.status,
                        )}`}
                      >
                        {request.status}
                      </span>
                    </div>

                    <div className="text-sm font-medium text-teal-600 dark:text-teal-400">
                      {isExpanded ? "Hide ↑" : "Review ↓"}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="border-t bg-slate-50/70 px-5 py-5 dark:border-neutral-700 dark:bg-neutral-800/40">
                      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                        <div>
                          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            User Justification
                          </p>

                          <div className="whitespace-pre-wrap rounded-xl border bg-white p-4 text-sm leading-6 text-slate-700 dark:border-neutral-700 dark:bg-neutral-900 dark:text-slate-200">
                            {request.justification}
                          </div>

                          <div className="mt-4 grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
                            <div>
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                Current language role
                              </p>

                              <span
                                className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${getRoleClass(
                                  request.currentRole,
                                )}`}
                              >
                                {request.currentRole}
                              </span>
                            </div>

                            <div>
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                Submitted
                              </p>

                              <p className="mt-1 text-slate-700 dark:text-slate-200">
                                {formatDate(request.createdAt)}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div>
                          {isPendingRequest ? (
                            <>
                              <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
                                Review Note
                                <span className="ml-1 text-xs font-normal text-slate-500">
                                  Optional
                                </span>
                              </label>

                              <textarea
                                value={reviewNote}
                                onChange={(event) =>
                                  setReviewNote(event.target.value)
                                }
                                maxLength={2000}
                                rows={6}
                                placeholder="Explain your decision to the user..."
                                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:ring-2 focus:ring-teal-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
                              />

                              <p className="mt-1 text-right text-xs text-slate-500 dark:text-slate-400">
                                {reviewNote.length}/2000
                              </p>

                              <div className="mt-4 flex flex-wrap gap-3">
                                <button
                                  type="button"
                                  disabled={isReviewing}
                                  onClick={() =>
                                    reviewRequest(request._id, "approved")
                                  }
                                  className="rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  {isReviewing
                                    ? "Saving..."
                                    : "Approve Request"}
                                </button>

                                <button
                                  type="button"
                                  disabled={isReviewing}
                                  onClick={() =>
                                    reviewRequest(request._id, "rejected")
                                  }
                                  className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  {isReviewing ? "Saving..." : "Reject Request"}
                                </button>
                              </div>
                            </>
                          ) : (
                            <div className="rounded-xl border bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900">
                              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                                Request Review
                              </p>

                              <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
                                Reviewed by:{" "}
                                {request.reviewedBy?.name || "Unknown admin"}
                              </p>

                              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                                Reviewed at: {formatDate(request.reviewedAt)}
                              </p>

                              <p className="mt-4 whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-200">
                                {request.reviewNote ||
                                  "No review note was provided."}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {pagination.totalPages > 1 && (
          <div className="mt-8 flex items-center justify-center gap-4">
            <button
              type="button"
              disabled={pagination.page <= 1 || loading}
              onClick={() => loadRequests(pagination.page - 1)}
              className="rounded-xl border px-4 py-2 text-sm font-medium transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
            >
              Previous
            </button>

            <span className="text-sm text-slate-600 dark:text-slate-300">
              Page {pagination.page} of {pagination.totalPages}
            </span>

            <button
              type="button"
              disabled={pagination.page >= pagination.totalPages || loading}
              onClick={() => loadRequests(pagination.page + 1)}
              className="rounded-xl border px-4 py-2 text-sm font-medium transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
