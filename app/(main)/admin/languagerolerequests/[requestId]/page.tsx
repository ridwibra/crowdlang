"use client";

import { authClient } from "@/lib/auth-client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Check, User, X } from "lucide-react";
import { toast } from "sonner";

type RequestStatus = "pending" | "approved" | "rejected" | "cancelled";

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

function formatDate(value: string | null) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString("en-US", {
    month: "long",
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

export default function AdminLanguageRoleRequestDetailPage() {
  const router = useRouter();
  const params = useParams<{ requestId: string }>();

  const requestId = params.requestId;

  const { data: session, isPending } = authClient.useSession();

  const globalRole = (session?.user as { role?: string } | undefined)?.role;
  const isAdmin = globalRole === "admin";

  const [roleRequest, setRoleRequest] = useState<RoleRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState(false);
  const [reviewNote, setReviewNote] = useState("");

  useEffect(() => {
    if (isPending) return;

    if (!session || !isAdmin) {
      router.replace("/unauthorized");
    }
  }, [isPending, session, isAdmin, router]);

  const loadRequest = useCallback(async () => {
    if (!requestId) return;

    try {
      setLoading(true);

      const response = await fetch(
        `/api/activity/requests/${encodeURIComponent(requestId)}`,
        {
          cache: "no-store",
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load the role request.");
      }

      setRoleRequest(data.request);
      setReviewNote(data.request?.reviewNote || "");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to load the role request.",
      );
    } finally {
      setLoading(false);
    }
  }, [requestId]);

  useEffect(() => {
    if (isPending || !session || !isAdmin || !requestId) return;

    void loadRequest();
  }, [isPending, session, isAdmin, requestId, loadRequest]);

  const reviewRequest = async (action: "approved" | "rejected") => {
    if (!roleRequest || roleRequest.status !== "pending") return;

    setReviewing(true);

    try {
      const response = await fetch(
        `/api/activity/requests/${encodeURIComponent(roleRequest._id)}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action,
            reviewNote: reviewNote.trim(),
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to review request.");
      }

      toast.success(data.message || "Request reviewed successfully.");

      await loadRequest();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to review request.",
      );
    } finally {
      setReviewing(false);
    }
  };

  if (isPending || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center pt-24">
        <div className="flex items-center gap-3 rounded-xl border bg-white px-6 py-4 shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-teal-500 border-t-transparent" />
          <span className="text-sm font-medium">Loading request...</span>
        </div>
      </div>
    );
  }

  if (!session || !isAdmin) {
    return null;
  }

  if (!roleRequest) {
    return (
      <div className="min-h-screen px-4 py-6 pt-24 dark:bg-neutral-950">
        <div className="mx-auto max-w-4xl rounded-3xl border bg-white p-8 text-center shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">
            Request not found
          </h1>

          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            This language role request may have been deleted or the link is
            invalid.
          </p>

          <Link
            href="/admin/languagerolerequests"
            className="mt-6 inline-flex rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-700"
          >
            Back to Requests
          </Link>
        </div>
      </div>
    );
  }

  const isPendingRequest = roleRequest.status === "pending";

  return (
    <div className="min-h-screen px-4 py-6 pt-24 dark:bg-neutral-950">
      <div className="mx-auto max-w-4xl">
        <Link
          href="/admin/languagerolerequests"
          className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-teal-600 transition hover:text-teal-700 dark:text-teal-400 dark:hover:text-teal-300"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Language Role Requests
        </Link>

        <main className="overflow-hidden rounded-3xl border bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <header className="border-b border-slate-200 bg-slate-50 px-6 py-6 dark:border-neutral-700 dark:bg-neutral-800/60 sm:px-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-600 dark:text-teal-400">
                  Admin Panel
                </p>

                <h1 className="mt-2 text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">
                  Language Role Request
                </h1>

                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                  Submitted {formatDate(roleRequest.createdAt)}
                </p>
              </div>

              <span
                className={`inline-flex w-fit rounded-full px-3 py-1.5 text-sm font-semibold capitalize ${getStatusClass(
                  roleRequest.status,
                )}`}
              >
                {roleRequest.status}
              </span>
            </div>
          </header>

          <div className="space-y-8 p-6 sm:p-8">
            <section>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Requesting User
              </h2>

              <div className="mt-4 flex items-center gap-4 rounded-2xl border bg-slate-50 p-4 dark:border-neutral-700 dark:bg-neutral-800/50">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-200 dark:bg-neutral-700">
                  {roleRequest.user?.image ? (
                    <img
                      src={roleRequest.user.image}
                      alt={roleRequest.user.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <User className="h-6 w-6 text-slate-600 dark:text-slate-300" />
                  )}
                </div>

                <div className="min-w-0">
                  <p className="truncate font-semibold text-slate-900 dark:text-white">
                    {roleRequest.user?.name || "Deleted user"}
                  </p>

                  <p className="truncate text-sm text-slate-600 dark:text-slate-300">
                    {roleRequest.user?.email || "No email available"}
                  </p>
                </div>
              </div>
            </section>

            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border p-5 dark:border-neutral-700">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Language
                </p>

                <p className="mt-2 text-lg font-bold text-slate-900 dark:text-white">
                  {roleRequest.language?.name || "Deleted language"}
                </p>

                {roleRequest.language?.countries?.length ? (
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                    {roleRequest.language.countries.join(", ")}
                  </p>
                ) : null}
              </div>

              <div className="rounded-2xl border p-5 dark:border-neutral-700">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Role Change
                </p>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${getRoleClass(
                      roleRequest.currentRole,
                    )}`}
                  >
                    {roleRequest.currentRole}
                  </span>

                  <span className="text-slate-400">→</span>

                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${getRoleClass(
                      roleRequest.requestedRole,
                    )}`}
                  >
                    {roleRequest.requestedRole}
                  </span>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                User Justification
              </h2>

              <div className="mt-4 whitespace-pre-wrap rounded-2xl border bg-slate-50 p-5 text-sm leading-7 text-slate-700 dark:border-neutral-700 dark:bg-neutral-800/50 dark:text-slate-200">
                {roleRequest.justification}
              </div>
            </section>

            {isPendingRequest ? (
              <section className="rounded-2xl border border-teal-200 bg-teal-50/50 p-5 dark:border-teal-900/70 dark:bg-teal-950/20">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Review Request
                </h2>

                <label
                  htmlFor="review-note"
                  className="mt-4 block text-sm font-medium text-slate-700 dark:text-slate-200"
                >
                  Review Note
                  <span className="ml-1 text-xs font-normal text-slate-500">
                    Optional
                  </span>
                </label>

                <textarea
                  id="review-note"
                  value={reviewNote}
                  onChange={(event) => setReviewNote(event.target.value)}
                  disabled={reviewing}
                  maxLength={2000}
                  rows={6}
                  placeholder="Explain the approval or rejection decision..."
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/30 disabled:cursor-not-allowed disabled:opacity-60 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
                />

                <p className="mt-1 text-right text-xs text-slate-500 dark:text-slate-400">
                  {reviewNote.length}/2000
                </p>

                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    type="button"
                    disabled={reviewing}
                    onClick={() => reviewRequest("approved")}
                    className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Check className="h-4 w-4" />
                    {reviewing ? "Saving..." : "Approve Request"}
                  </button>

                  <button
                    type="button"
                    disabled={reviewing}
                    onClick={() => reviewRequest("rejected")}
                    className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <X className="h-4 w-4" />
                    {reviewing ? "Saving..." : "Reject Request"}
                  </button>
                </div>
              </section>
            ) : (
              <section className="rounded-2xl border bg-slate-50 p-5 dark:border-neutral-700 dark:bg-neutral-800/50">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Review Decision
                </h2>

                <dl className="mt-4 space-y-3 text-sm">
                  <div>
                    <dt className="text-slate-500 dark:text-slate-400">
                      Reviewed by
                    </dt>

                    <dd className="mt-1 font-medium text-slate-900 dark:text-white">
                      {roleRequest.reviewedBy?.name || "Unknown admin"}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-slate-500 dark:text-slate-400">
                      Reviewed at
                    </dt>

                    <dd className="mt-1 font-medium text-slate-900 dark:text-white">
                      {formatDate(roleRequest.reviewedAt)}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-slate-500 dark:text-slate-400">
                      Review note
                    </dt>

                    <dd className="mt-1 whitespace-pre-wrap text-slate-900 dark:text-white">
                      {roleRequest.reviewNote || "No review note was provided."}
                    </dd>
                  </div>
                </dl>
              </section>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
