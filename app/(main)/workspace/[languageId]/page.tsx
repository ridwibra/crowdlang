"use client";

import { authClient } from "@/lib/auth-client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type LanguageRole = "creator" | "editor" | "expert";

type LanguageStatus = "active" | "archived" | "pending_deletion";

type UserSummary = {
  _id?: string;
  name?: string;
  email?: string;
};

type EditRequest = {
  requestedBy?: UserSummary | null;
  requestedAt?: string;
  proposedChanges?: {
    name?: string;
    countries?: string[];
    status?: "active" | "archived";
  };
  requestNote?: string;
};

type WorkspaceLanguage = {
  _id: string;
  name: string;
  countries: string[];
  status: LanguageStatus;
  createdBy?: UserSummary | null;
  editRequest?: EditRequest | null;
};

type WorkspaceLanguageResponse = {
  language: WorkspaceLanguage;
  currentUserRole?: LanguageRole;
  canReviewEdit?: boolean;
};

type EditDecision = "approve_edit" | "refuse_edit";

function formatDate(value?: string) {
  if (!value) {
    return "Unknown date";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown date";
  }

  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function displayStatus(status: string) {
  return status.replaceAll("_", " ");
}

function countryList(countries?: string[]) {
  if (!countries || countries.length === 0) {
    return "No countries listed";
  }

  return countries.join(", ");
}

export default function LanguageWorkspacePage() {
  const params = useParams<{ languageId: string }>();
  const router = useRouter();

  const languageId = params.languageId;

  const { data: session, isPending: sessionLoading } = authClient.useSession();

  const [language, setLanguage] = useState<WorkspaceLanguage | null>(null);

  const [currentUserRole, setCurrentUserRole] = useState<LanguageRole | null>(
    null,
  );

  const [canReviewEdit, setCanReviewEdit] = useState(false);

  const [loading, setLoading] = useState(true);

  const [processing, setProcessing] = useState<EditDecision | null>(null);

  const currentUserId = session?.user?.id;

  const loadWorkspaceLanguage = useCallback(async () => {
    if (!languageId) {
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        `/api/languages/${languageId}?scope=workspace`,
        {
          cache: "no-store",
        },
      );

      const data = (await response.json().catch(() => ({}))) as
        | WorkspaceLanguageResponse
        | {
            error?: string;
            message?: string;
          };

      if (!response.ok) {
        const errorData = data as {
          error?: string;
          message?: string;
        };

        throw new Error(
          errorData.error ||
            errorData.message ||
            "Failed to load language workspace.",
        );
      }

      const workspaceData = data as WorkspaceLanguageResponse;

      setLanguage(workspaceData.language);
      setCurrentUserRole(workspaceData.currentUserRole || null);
      setCanReviewEdit(Boolean(workspaceData.canReviewEdit));
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to load language workspace.",
      );

      setLanguage(null);
    } finally {
      setLoading(false);
    }
  }, [languageId]);

  useEffect(() => {
    if (sessionLoading) {
      return;
    }

    if (!session) {
      router.replace("/login");
      return;
    }

    loadWorkspaceLanguage();
  }, [sessionLoading, session, router, loadWorkspaceLanguage]);

  const editRequest = language?.editRequest || null;

  const requesterId = editRequest?.requestedBy?._id;

  const isOwnRequest = useMemo(() => {
    if (!currentUserId || !requesterId) {
      return false;
    }

    return currentUserId === requesterId;
  }, [currentUserId, requesterId]);

  const hasValidRequester = Boolean(requesterId);

  const canTakeDecision =
    Boolean(editRequest) &&
    Boolean(editRequest?.proposedChanges) &&
    canReviewEdit &&
    !isOwnRequest;

  const handleDecision = async (action: EditDecision) => {
    if (!language) {
      return;
    }

    if (!canTakeDecision) {
      toast.error("You do not have permission to review this edit request.");
      return;
    }

    const isApproval = action === "approve_edit";

    const confirmed = window.confirm(
      isApproval
        ? "Approve this edit request? The proposed language changes will become visible immediately."
        : "Refuse this edit request? The language will remain unchanged.",
    );

    if (!confirmed) {
      return;
    }

    setProcessing(action);

    try {
      const response = await fetch(`/api/languages/${language._id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.error ||
            data.message ||
            "Failed to process the language edit request.",
        );
      }

      toast.success(
        isApproval
          ? "Edit request approved. The language has been updated."
          : "Edit request refused. The language remains unchanged.",
      );

      router.refresh();
      router.push("/workspace");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to process the language edit request.",
      );
    } finally {
      setProcessing(null);
    }
  };

  if (sessionLoading || loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center rounded-3xl border border-white/50 bg-white/80 p-6 shadow-xl backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/80">
        <div className="flex items-center gap-3 text-sm font-medium text-slate-600 dark:text-slate-300">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-teal-500 border-t-transparent" />
          Loading language workspace...
        </div>
      </div>
    );
  }

  if (!language) {
    return (
      <section className="rounded-3xl border border-red-200 bg-red-50 p-8 text-center shadow-sm dark:border-red-500/20 dark:bg-red-500/10">
        <h1 className="text-xl font-bold text-red-800 dark:text-red-200">
          Language workspace unavailable
        </h1>

        <p className="mt-2 text-sm text-red-700 dark:text-red-300">
          The language may not exist, may be unavailable, or you may not have
          access to this workspace.
        </p>

        <Link
          href="/workspace"
          className="mt-5 inline-flex rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-teal-700"
        >
          ← Back to My Languages
        </Link>
      </section>
    );
  }

  const proposedChanges = editRequest?.proposedChanges || {};

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-white/50 bg-white/80 p-7 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/80 sm:p-10">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-600 dark:text-teal-400">
              Language authority
            </p>

            <h1 className="mt-2 break-words text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              {language.name}
            </h1>

            <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
              Review pending language changes and manage your assigned language
              work.
            </p>
          </div>

          {currentUserRole && (
            <span
              className={`w-fit rounded-full px-3 py-1.5 text-xs font-bold capitalize ${
                currentUserRole === "expert"
                  ? "bg-violet-100 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300"
                  : currentUserRole === "editor"
                    ? "bg-teal-100 text-teal-700 dark:bg-teal-500/10 dark:text-teal-300"
                    : "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300"
              }`}
            >
              {currentUserRole}
            </span>
          )}
        </div>

        <div className="mt-7 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800/50">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
              Current name
            </p>

            <p className="mt-2 break-words text-lg font-bold text-slate-900 dark:text-white">
              {language.name}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800/50">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
              Current status
            </p>

            <p className="mt-2 text-lg font-bold capitalize text-slate-900 dark:text-white">
              {displayStatus(language.status)}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:col-span-2 dark:border-slate-700 dark:bg-slate-800/50">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
              Current countries and territories
            </p>

            <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-200">
              {countryList(language.countries)}
            </p>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl border border-white/50 bg-white/80 shadow-xl backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/80">
        <div className="border-b border-slate-200 p-6 dark:border-slate-700 sm:p-7">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-600 dark:text-teal-400">
            Edit review queue
          </p>

          <h2 className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
            Pending Language Edit Request
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
            Review proposed language metadata changes before they become live.
          </p>
        </div>

        {!editRequest ? (
          <div className="p-6 sm:p-7">
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center dark:border-slate-700 dark:bg-slate-800/50">
              <p className="font-semibold text-slate-800 dark:text-slate-100">
                No pending edit request
              </p>

              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                There are no language changes waiting for review.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6 p-6 sm:p-7">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                  Requested by
                </p>

                <p className="mt-2 break-words font-bold text-slate-900 dark:text-white">
                  {editRequest.requestedBy?.name || "Unknown user"}
                </p>

                {editRequest.requestedBy?.email && (
                  <p className="mt-1 break-all text-sm text-slate-500 dark:text-slate-400">
                    {editRequest.requestedBy.email}
                  </p>
                )}

                {!editRequest.requestedBy && (
                  <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
                    The original requester account is unavailable.
                  </p>
                )}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                  Requested on
                </p>

                <p className="mt-2 font-bold text-slate-900 dark:text-white">
                  {formatDate(editRequest.requestedAt)}
                </p>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700">
              <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] border-b border-slate-200 bg-slate-100 text-xs font-bold uppercase tracking-[0.12em] text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                <div className="p-4">Current value</div>

                <div className="border-l border-slate-200 p-4 dark:border-slate-700">
                  Proposed value
                </div>
              </div>

              {proposedChanges.name !== undefined && (
                <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] border-b border-slate-200 dark:border-slate-700">
                  <div className="p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                      Name
                    </p>

                    <p className="mt-2 break-words text-sm font-semibold text-slate-900 dark:text-white">
                      {language.name}
                    </p>
                  </div>

                  <div className="border-l border-slate-200 p-4 dark:border-slate-700">
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-teal-600 dark:text-teal-400">
                      Name
                    </p>

                    <p className="mt-2 break-words text-sm font-semibold text-slate-900 dark:text-white">
                      {proposedChanges.name}
                    </p>
                  </div>
                </div>
              )}

              {proposedChanges.countries !== undefined && (
                <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] border-b border-slate-200 dark:border-slate-700">
                  <div className="p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                      Countries
                    </p>

                    <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-200">
                      {countryList(language.countries)}
                    </p>
                  </div>

                  <div className="border-l border-slate-200 p-4 dark:border-slate-700">
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-teal-600 dark:text-teal-400">
                      Countries
                    </p>

                    <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-200">
                      {countryList(proposedChanges.countries)}
                    </p>
                  </div>
                </div>
              )}

              {proposedChanges.status !== undefined && (
                <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                  <div className="p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                      Status
                    </p>

                    <p className="mt-2 text-sm font-semibold capitalize text-slate-900 dark:text-white">
                      {displayStatus(language.status)}
                    </p>
                  </div>

                  <div className="border-l border-slate-200 p-4 dark:border-slate-700">
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-teal-600 dark:text-teal-400">
                      Status
                    </p>

                    <p className="mt-2 text-sm font-semibold capitalize text-slate-900 dark:text-white">
                      {displayStatus(proposedChanges.status)}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {editRequest.requestNote && (
              <div className="rounded-2xl border border-teal-200 bg-teal-50 p-4 dark:border-teal-500/20 dark:bg-teal-500/10">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-teal-700 dark:text-teal-300">
                  Request note
                </p>

                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-teal-900 dark:text-teal-100">
                  {editRequest.requestNote}
                </p>
              </div>
            )}

            {!hasValidRequester && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
                This request cannot be approved or refused because the original
                requester data is missing. A global admin should inspect the
                language record before resolving it.
              </div>
            )}

            {hasValidRequester && isOwnRequest && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
                You submitted this request, so another authorized language
                authority must review it.
              </div>
            )}

            {hasValidRequester && !canReviewEdit && !isOwnRequest && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-300">
                You can view this request, but you do not have authority to
                approve or refuse it.
              </div>
            )}

            {canTakeDecision && (
              <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:justify-end dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => handleDecision("refuse_edit")}
                  disabled={processing !== null}
                  className="inline-flex min-h-11 items-center justify-center rounded-xl border border-red-200 bg-red-50 px-5 py-2.5 text-sm font-bold text-red-700 transition hover:border-red-300 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300 dark:hover:bg-red-500/20"
                >
                  {processing === "refuse_edit"
                    ? "Refusing..."
                    : "Refuse request"}
                </button>

                <button
                  type="button"
                  onClick={() => handleDecision("approve_edit")}
                  disabled={processing !== null}
                  className="inline-flex min-h-11 items-center justify-center rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {processing === "approve_edit"
                    ? "Approving..."
                    : "Approve changes"}
                </button>
              </div>
            )}
          </div>
        )}
      </section>

      <Link
        href="/workspace"
        className="inline-flex rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-teal-700"
      >
        ← Back to My Languages
      </Link>
    </div>
  );
}
