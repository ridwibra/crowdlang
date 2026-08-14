"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type EssayStatus = "draft" | "pending" | "published" | "approved" | "rejected";

type StatusFilter = "all" | EssayStatus;

type StatusSort =
  | "newest"
  | "oldest"
  | "review-priority"
  | "status-ascending"
  | "status-descending";

type EssayImage = {
  image_url: string;
  public_id: string | null;
};

type EssayUser = {
  _id: string;
  name: string;
  email: string;
  avatar?: string;
};

type AdminEssay = {
  _id: string;
  title: string;
  category: string;
  body: string;
  translationTitle: string;
  translationBody: string;
  level: string;
  status: EssayStatus;
  tags: string[];
  images: EssayImage[];
  createdAt?: string;
  updatedAt?: string;

  language: {
    _id: string;
    name: string;
  } | null;

  author: EssayUser | null;
  editedBy: EssayUser[];
  approvedBy: EssayUser[];
};

const STATUS_OPTIONS: Array<{
  value: StatusFilter;
  label: string;
}> = [
  { value: "all", label: "All statuses" },
  { value: "draft", label: "Draft" },
  { value: "pending", label: "Pending" },
  { value: "published", label: "Published" },
  { value: "rejected", label: "Rejected" },
];

const SORT_OPTIONS: Array<{
  value: StatusSort;
  label: string;
}> = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "review-priority", label: "Review priority" },
  {
    value: "status-ascending",
    label: "Status: Draft → Rejected",
  },
  {
    value: "status-descending",
    label: "Status: Rejected → Draft",
  },
];

const REVIEW_STATUS_PRIORITY: Record<EssayStatus, number> = {
  pending: 0,
  draft: 1,
  rejected: 2,
  approved: 4,
  published: 3,
};

const STATUS_ORDER: Record<EssayStatus, number> = {
  draft: 0,
  pending: 1,
  published: 2,
  rejected: 3,
  approved: 4,
};

function getStatusClass(status: EssayStatus) {
  if (status === "published") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-300";
  }

  if (status === "rejected") {
    return "bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-500/10 dark:text-red-300";
  }

  if (status === "pending") {
    return "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-300";
  }

  return "bg-slate-100 text-slate-700 ring-slate-600/20 dark:bg-slate-800 dark:text-slate-300";
}

function formatDate(value?: string) {
  if (!value) return "Unknown";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function StatusBadge({ status }: { status: EssayStatus }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold capitalize ring-1 ring-inset ${getStatusClass(
        status,
      )}`}
    >
      {status}
    </span>
  );
}

export default function AdminEssaysPage() {
  const [essays, setEssays] = useState<AdminEssay[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingEssayId, setUpdatingEssayId] = useState("");

  const [search, setSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<StatusFilter>("all");

  const [statusSort, setStatusSort] = useState<StatusSort>("review-priority");

  const [selectedEssay, setSelectedEssay] = useState<AdminEssay | null>(null);

  const [pendingStatuses, setPendingStatuses] = useState<
    Record<string, EssayStatus>
  >({});

  const [moderationComments, setModerationComments] = useState<
    Record<string, string>
  >({});

  const loadEssays = useCallback(async () => {
    try {
      setLoading(true);

      const response = await fetch("/api/essayapprove", {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to load essays.");
      }

      const normalizedEssays: AdminEssay[] = Array.isArray(data.essays)
        ? data.essays.map((essay: AdminEssay) => ({
            ...essay,
            tags: Array.isArray(essay.tags) ? essay.tags : [],
            images: Array.isArray(essay.images) ? essay.images : [],
            editedBy: Array.isArray(essay.editedBy) ? essay.editedBy : [],
            approvedBy: Array.isArray(essay.approvedBy) ? essay.approvedBy : [],
          }))
        : [];

      setEssays(normalizedEssays);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to load essays.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadEssays();
  }, [loadEssays]);

  const filteredEssays = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    const matchingEssays = essays.filter((essay) => {
      const matchesStatus =
        selectedStatus === "all" || essay.status === selectedStatus;

      const searchableText = [
        essay.title,
        essay.category,
        essay.level,
        essay.language?.name || "",
        essay.author?.name || "",
        essay.author?.email || "",
        ...essay.tags,
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !normalizedSearch || searchableText.includes(normalizedSearch);

      return matchesStatus && matchesSearch;
    });

    return [...matchingEssays].sort((first, second) => {
      const firstDate = new Date(first.createdAt || 0).getTime();

      const secondDate = new Date(second.createdAt || 0).getTime();

      if (statusSort === "newest") {
        return secondDate - firstDate;
      }

      if (statusSort === "oldest") {
        return firstDate - secondDate;
      }

      if (statusSort === "review-priority") {
        const difference =
          REVIEW_STATUS_PRIORITY[first.status] -
          REVIEW_STATUS_PRIORITY[second.status];

        return difference || secondDate - firstDate;
      }

      if (statusSort === "status-ascending") {
        const difference =
          STATUS_ORDER[first.status] - STATUS_ORDER[second.status];

        return difference || secondDate - firstDate;
      }

      const difference =
        STATUS_ORDER[second.status] - STATUS_ORDER[first.status];

      return difference || secondDate - firstDate;
    });
  }, [essays, search, selectedStatus, statusSort]);

  const statusCounts = useMemo(
    () => ({
      all: essays.length,
      draft: essays.filter((essay) => essay.status === "draft").length,
      pending: essays.filter((essay) => essay.status === "pending").length,
      published: essays.filter((essay) => essay.status === "published").length,
      approved: essays.filter((essay) => essay.status === "approved").length,
      rejected: essays.filter((essay) => essay.status === "rejected").length,
    }),
    [essays],
  );

  const openEssayReview = (essay: AdminEssay) => {
    setSelectedEssay(essay);

    setPendingStatuses((currentStatuses) => ({
      ...currentStatuses,
      [essay._id]: currentStatuses[essay._id] || essay.status,
    }));
  };

  const updateEssayStatus = async (
    essayId: string,
    status: EssayStatus,
    comment: string,
  ) => {
    const trimmedComment = comment.trim();

    if (status === "rejected" && !trimmedComment) {
      toast.error("A reviewer comment is required when rejecting an essay.");
      return;
    }

    try {
      setUpdatingEssayId(essayId);

      const response = await fetch(`/api/essayapprove/${essayId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status,
          comment: trimmedComment,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to update essay status.");
      }

      const updatedStatus = data.essay.status as EssayStatus;

      setEssays((currentEssays) =>
        currentEssays.map((essay) =>
          essay._id === essayId
            ? {
                ...essay,
                status: updatedStatus,
                approvedBy: Array.isArray(data.essay.approvedBy)
                  ? data.essay.approvedBy
                  : essay.approvedBy,
                updatedAt: data.essay.updatedAt,
              }
            : essay,
        ),
      );

      setSelectedEssay((currentEssay) =>
        currentEssay?._id === essayId
          ? {
              ...currentEssay,
              status: updatedStatus,
              approvedBy: Array.isArray(data.essay.approvedBy)
                ? data.essay.approvedBy
                : currentEssay.approvedBy,
              updatedAt: data.essay.updatedAt,
            }
          : currentEssay,
      );

      setPendingStatuses((currentStatuses) => ({
        ...currentStatuses,
        [essayId]: updatedStatus,
      }));

      setModerationComments((currentComments) => ({
        ...currentComments,
        [essayId]: "",
      }));

      toast.success(`Essay status changed to ${updatedStatus}.`);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to update essay status.",
      );
    } finally {
      setUpdatingEssayId("");
    }
  };

  return (
    <div className="space-y-8">
      {/* Page header */}
      <section className="overflow-hidden rounded-3xl border border-white/50 bg-white/80 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/80">
        <div className="h-1.5 bg-gradient-to-r from-violet-600 via-fuchsia-500 to-pink-500" />

        <div className="p-7 sm:p-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-violet-600 dark:text-violet-300">
                Content moderation
              </p>

              <h1 className="mt-3 bg-gradient-to-r from-violet-600 to-fuchsia-500 bg-clip-text text-4xl font-extrabold tracking-tight text-transparent dark:from-violet-300 dark:to-fuchsia-300">
                Essay Review Queue
              </h1>

              <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                Review submissions from every language. Open an essay to read
                the full content, add feedback, and save a moderation decision.
              </p>
            </div>

            <button
              type="button"
              onClick={() => void loadEssays()}
              disabled={loading}
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-violet-200 bg-violet-50 px-4 py-2.5 text-sm font-semibold text-violet-700 transition hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-300 dark:hover:bg-violet-500/20"
            >
              {loading ? "Refreshing..." : "Refresh queue"}
            </button>
          </div>
        </div>
      </section>

      {/* Status summary and filter buttons */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {STATUS_OPTIONS.map((option) => {
          const count =
            option.value === "all"
              ? statusCounts.all
              : statusCounts[option.value];

          const isActive = selectedStatus === option.value;

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => setSelectedStatus(option.value)}
              className={`rounded-2xl border p-5 text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 dark:focus:ring-offset-slate-950 ${
                isActive
                  ? "border-violet-500 bg-violet-600 text-white"
                  : "border-white/50 bg-white/80 text-slate-900 dark:border-white/10 dark:bg-slate-900/80 dark:text-white"
              }`}
            >
              <p
                className={`text-sm font-semibold ${
                  isActive
                    ? "text-violet-100"
                    : "text-slate-500 dark:text-slate-400"
                }`}
              >
                {option.label}
              </p>

              <p className="mt-3 text-3xl font-extrabold">
                {loading ? "—" : count}
              </p>
            </button>
          );
        })}
      </section>

      {/* Main queue */}
      <section className="overflow-hidden rounded-3xl border border-white/50 bg-white/80 shadow-xl backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/80">
        <div className="border-b border-slate-200 p-6 dark:border-slate-700">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                Moderation queue
              </p>

              <h2 className="mt-1 text-xl font-bold text-slate-900 dark:text-white">
                Essays
              </h2>

              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                {filteredEssays.length}{" "}
                {filteredEssays.length === 1 ? "essay" : "essays"} shown
              </p>
            </div>

            <div className="grid w-full gap-3 lg:max-w-3xl lg:grid-cols-[minmax(0,1fr)_13rem]">
              <div className="relative">
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg text-slate-400"
                >
                  ⌕
                </span>

                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search title, language, author, category, or tag..."
                  className="min-h-11 w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500"
                />
              </div>

              <select
                value={statusSort}
                onChange={(event) =>
                  setStatusSort(event.target.value as StatusSort)
                }
                className="min-h-11 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    Sort: {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-violet-200 border-t-violet-600" />

            <p className="mt-4 text-sm font-medium text-slate-500 dark:text-slate-400">
              Loading moderation queue...
            </p>
          </div>
        ) : filteredEssays.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-2xl text-slate-400 dark:bg-slate-800">
              ✦
            </div>

            <h3 className="mt-5 font-bold text-slate-900 dark:text-white">
              No essays found
            </h3>

            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Change the search phrase, status filter, or sort preference.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-700">
            {filteredEssays.map((essay) => (
              <article
                key={essay._id}
                className="group p-5 transition duration-200 hover:bg-violet-50/40 dark:hover:bg-violet-500/5 sm:p-6"
              >
                <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={essay.status} />

                      {essay.level && (
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                          {essay.level}
                        </span>
                      )}

                      {essay.category && (
                        <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
                          {essay.category}
                        </span>
                      )}
                    </div>

                    <h3 className="mt-3 break-words text-xl font-bold text-slate-900 dark:text-white">
                      {essay.title}
                    </h3>

                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm text-slate-500 dark:text-slate-400">
                      <span>
                        Language:{" "}
                        <strong className="font-semibold text-slate-700 dark:text-slate-200">
                          {essay.language?.name || "Unknown"}
                        </strong>
                      </span>

                      <span>
                        Author:{" "}
                        <strong className="font-semibold text-slate-700 dark:text-slate-200">
                          {essay.author?.name || "Unknown"}
                        </strong>
                      </span>

                      <span>Updated: {formatDate(essay.updatedAt)}</span>
                    </div>

                    {essay.tags.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {essay.tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {essay.approvedBy.length > 0 && (
                      <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
                        Published by:{" "}
                        {essay.approvedBy
                          .map((user) => user.name)
                          .filter(Boolean)
                          .join(", ")}
                      </p>
                    )}
                  </div>

                  <div className="flex w-full shrink-0 flex-col gap-3 xl:w-44">
                    <button
                      type="button"
                      onClick={() => openEssayReview(essay)}
                      className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
                    >
                      View & Review
                    </button>

                    <p className="text-center text-xs leading-5 text-slate-500 dark:text-slate-400">
                      Read the full essay and save a decision.
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Review modal */}
      {selectedEssay && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="essay-details-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm"
        >
          <button
            type="button"
            aria-label="Close essay details"
            onClick={() => setSelectedEssay(null)}
            className="absolute inset-0 cursor-default"
          />

          <section className="relative z-10 flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-white/30 bg-white shadow-2xl dark:border-white/10 dark:bg-slate-900">
            <header className="flex items-start justify-between gap-5 border-b border-slate-200 bg-gradient-to-r from-violet-50 via-fuchsia-50 to-pink-50 px-6 py-5 dark:border-slate-700 dark:from-violet-500/10 dark:via-fuchsia-500/10 dark:to-pink-500/10 sm:px-8">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={selectedEssay.status} />

                  {selectedEssay.category && (
                    <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
                      {selectedEssay.category}
                    </span>
                  )}

                  {selectedEssay.level && (
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      {selectedEssay.level}
                    </span>
                  )}
                </div>

                <h2
                  id="essay-details-title"
                  className="mt-3 break-words text-2xl font-extrabold text-slate-950 dark:text-white"
                >
                  {selectedEssay.title}
                </h2>

                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                  {selectedEssay.language?.name || "Unknown language"} · By{" "}
                  {selectedEssay.author?.name || "Unknown author"}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedEssay(null)}
                aria-label="Close essay details"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-300 bg-white text-lg font-bold text-slate-600 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                ✕
              </button>
            </header>

            <div className="overflow-y-auto p-6 sm:p-8">
              <div className="grid gap-6 xl:grid-cols-2">
                <section>
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                      Original essay
                    </p>
                  </div>

                  <div
                    className="prose prose-slate max-w-none rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm leading-7 dark:prose-invert dark:border-slate-700 dark:bg-slate-800/60 dark:prose-p:text-slate-300"
                    dangerouslySetInnerHTML={{
                      __html:
                        selectedEssay.body ||
                        "<p>No original essay text added.</p>",
                    }}
                  />
                </section>

                <section>
                  <p className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-indigo-700 dark:text-indigo-300">
                    {selectedEssay.translationTitle || "English translation"}
                  </p>

                  <div
                    className="prose prose-slate max-w-none rounded-2xl border border-indigo-100 bg-indigo-50/50 p-5 text-sm leading-7 dark:prose-invert dark:border-indigo-500/20 dark:bg-indigo-500/5 dark:prose-p:text-slate-300"
                    dangerouslySetInnerHTML={{
                      __html:
                        selectedEssay.translationBody ||
                        "<p>No English translation added.</p>",
                    }}
                  />
                </section>
              </div>

              {selectedEssay.images.length > 0 && (
                <section className="mt-8">
                  <p className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                    Images
                  </p>

                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {selectedEssay.images.map((image) => (
                      <div
                        key={image.public_id ?? image.image_url}
                        className="aspect-square overflow-hidden rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={image.image_url}
                          alt={`Image for ${selectedEssay.title}`}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                </section>
              )}

              <div className="mt-8 grid gap-6 border-t border-slate-200 pt-6 dark:border-slate-700 md:grid-cols-2">
                <section>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                    Author
                  </p>

                  <p className="mt-2 font-semibold text-slate-800 dark:text-slate-100">
                    {selectedEssay.author?.name || "Unknown author"}
                  </p>

                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    {selectedEssay.author?.email || "No email available"}
                  </p>
                </section>

                <section>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                    Dates
                  </p>

                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                    Created: {formatDate(selectedEssay.createdAt)}
                  </p>

                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                    Updated: {formatDate(selectedEssay.updatedAt)}
                  </p>
                </section>
              </div>

              {selectedEssay.tags.length > 0 && (
                <section className="mt-7">
                  <p className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                    Tags
                  </p>

                  <div className="flex flex-wrap gap-2">
                    {selectedEssay.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </section>
              )}

              {selectedEssay.editedBy.length > 0 && (
                <section className="mt-7">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                    Edited by
                  </p>

                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                    {selectedEssay.editedBy
                      .map((user) => user.name)
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                </section>
              )}

              {selectedEssay.approvedBy.length > 0 && (
                <section className="mt-7">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                    Published by
                  </p>

                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                    {selectedEssay.approvedBy
                      .map((user) => user.name)
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                </section>
              )}
            </div>

            {/* Moderation decision panel */}
            <footer className="border-t border-slate-200 bg-slate-50 px-6 py-6 dark:border-slate-700 dark:bg-slate-800/70 sm:px-8">
              <div className="mb-5 border-b border-slate-200 pb-4 dark:border-slate-700">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-violet-600 dark:text-violet-300">
                  Moderation decision
                </p>

                <h3 className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
                  Review and save this essay
                </h3>

                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Add constructive feedback for the author. A reviewer comment
                  is required when rejecting an essay.
                </p>
              </div>

              <div className="grid gap-4 lg:grid-cols-[12rem_minmax(0,1fr)_auto] lg:items-end">
                <div>
                  <label
                    htmlFor={`modal-status-${selectedEssay._id}`}
                    className="mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400"
                  >
                    Decision
                  </label>

                  <select
                    id={`modal-status-${selectedEssay._id}`}
                    value={
                      pendingStatuses[selectedEssay._id] || selectedEssay.status
                    }
                    disabled={updatingEssayId === selectedEssay._id}
                    onChange={(event) =>
                      setPendingStatuses((currentStatuses) => ({
                        ...currentStatuses,
                        [selectedEssay._id]: event.target.value as EssayStatus,
                      }))
                    }
                    className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                  >
                    <option value="draft">Draft</option>
                    <option value="pending">Pending</option>
                    <option value="published">Published</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor={`modal-comment-${selectedEssay._id}`}
                    className="mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400"
                  >
                    Reviewer comment
                  </label>

                  <textarea
                    id={`modal-comment-${selectedEssay._id}`}
                    value={moderationComments[selectedEssay._id] || ""}
                    disabled={updatingEssayId === selectedEssay._id}
                    onChange={(event) =>
                      setModerationComments((currentComments) => ({
                        ...currentComments,
                        [selectedEssay._id]: event.target.value,
                      }))
                    }
                    placeholder="Example: Please add an English translation and verify the historical source."
                    maxLength={2000}
                    rows={3}
                    className="w-full resize-y rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:placeholder:text-slate-500"
                  />

                  <p className="mt-1 text-right text-xs text-slate-500 dark:text-slate-400">
                    {(moderationComments[selectedEssay._id] || "").length} /
                    2000
                  </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
                  <button
                    type="button"
                    disabled={updatingEssayId === selectedEssay._id}
                    onClick={() =>
                      void updateEssayStatus(
                        selectedEssay._id,
                        pendingStatuses[selectedEssay._id] ||
                          selectedEssay.status,
                        moderationComments[selectedEssay._id] || "",
                      )
                    }
                    className="inline-flex min-h-11 items-center justify-center rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 dark:focus:ring-offset-slate-900"
                  >
                    {updatingEssayId === selectedEssay._id
                      ? "Saving..."
                      : "Save decision"}
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedEssay(null)}
                    className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    Close details
                  </button>
                </div>
              </div>
            </footer>
          </section>
        </div>
      )}
    </div>
  );
}
