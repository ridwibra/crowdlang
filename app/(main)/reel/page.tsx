// app/reel/page.tsx
import Link from "next/link";
import ReelCard from "@/components/ReelCard";
import { getSession } from "@/lib/server";
import Language from "@/models/Language";
import Reel from "@/models/Reel";
import db from "@/utils/db";
import User from "@/models/User";
import type { ReelCardType } from "@/utils/types";

interface ReelsPageProps {
  searchParams: Promise<{
    lang?: string | string[];
  }>;
}

type UserRole = "user" | "staff" | "admin" | "root";

function serializeDate(value: unknown): string {
  if (!value) return "";

  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

export default async function ReelsPage({ searchParams }: ReelsPageProps) {
  const resolvedSearchParams = await searchParams;
  const rawLang = resolvedSearchParams.lang;
  const selectedLang = typeof rawLang === "string" ? rawLang : "";

  const session = await getSession();

  await db.connect();

  const [currentUser, reelsRaw, languagesRaw] = await Promise.all([
    session?.user?.email
      ? User.findOne({ email: session.user.email }).select("_id role").lean()
      : Promise.resolve(null),

    Reel.find()
      .populate({
        path: "author",
        select: "name avatar image",
        model: User,
      })
      .populate({
        path: "language",
        select: "name",
        model: Language,
      })
      .populate({
        path: "comments.user",
        select: "name avatar image",
        model: User,
      })
      .sort({ createdAt: -1 })
      .lean(),

    Language.find().select("_id name").sort({ name: 1 }).lean(),
  ]);

  const currentUserId = currentUser?._id?.toString() ?? null;

  const currentUserRole: UserRole =
    currentUser?.role === "admin" ||
    currentUser?.role === "root" ||
    currentUser?.role === "staff"
      ? currentUser.role
      : "user";

  const languages: { _id: string; name: string }[] = languagesRaw.map(
    (language: any) => ({
      _id: language._id.toString(),
      name: language.name,
    }),
  );

  const reels: ReelCardType[] = reelsRaw.map((reel: any) => {
    const likes: string[] = reel.likes?.map(String) ?? [];

    return {
      _id: reel._id.toString(),
      caption: reel.caption || "",
      tags: reel.tags ?? [],
      transcription: reel.transcription ?? "",
      translation: reel.translation ?? "",
      language:
        typeof reel.language === "string"
          ? reel.language
          : reel.language?.name || "Unknown",
      languageId: reel.language?._id?.toString() ?? "",
      media: {
        image_url: reel.media?.image_url || "",
        public_id: reel.media?.public_id || "",
      },
      author: reel.author
        ? {
            _id: reel.author._id.toString(),
            name: reel.author.name || "Unknown contributor",
            avatar: reel.author.avatar?.image_url || reel.author.image || null,
          }
        : null,
      likes,
      comments: (reel.comments ?? [])
        .filter(
          (comment: any) => !comment.status || comment.status === "visible",
        )
        .sort(
          (first: any, second: any) =>
            new Date(second.createdAt).getTime() -
            new Date(first.createdAt).getTime(),
        )
        .map((comment: any) => ({
          _id: comment._id.toString(),
          text: comment.text || "",
          user: comment.user
            ? {
                _id: comment.user._id?.toString() ?? String(comment.user),
                name: comment.user.name || "Unknown contributor",
                avatar:
                  comment.user.avatar?.image_url || comment.user.image || null,
              }
            : {
                _id: "",
                name: "Unknown contributor",
                avatar: null,
              },
          likes: comment.likes?.map(String) ?? [],
          createdAt: serializeDate(comment.createdAt),
          updatedAt: serializeDate(comment.updatedAt),
        })),
      createdAt: serializeDate(reel.createdAt),
      type: reel.type === "audio" ? "audio" : "video",
      hasLiked: Boolean(currentUserId && likes.includes(currentUserId)),
    };
  });

  const uniqueLanguages = [
    ...new Set(reels.map((reel) => reel.language).filter(Boolean)),
  ].sort((first, second) => first.localeCompare(second));

  const filteredReels = selectedLang
    ? reels.filter((reel) => reel.language === selectedLang)
    : reels;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-cyan-50/40 to-slate-100 px-4 pb-16 pt-5 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <section className="rounded-2xl border border-white/50 bg-white/80 p-4 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/80 sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <div
                  aria-hidden="true"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-cyan-500 text-lg shadow-md shadow-teal-500/20"
                >
                  🎬
                </div>
                <div className="min-w-0">
                  <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
                    Reels
                  </h1>
                  <p className="text-xs text-slate-500 dark:text-slate-400 sm:text-sm">
                    Community stories, language, and culture
                  </p>
                </div>
              </div>
            </div>

            <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto">
              <form
                action="/reel"
                method="GET"
                className="flex min-w-0 flex-1 gap-2 lg:w-80"
              >
                <input
                  id="language-filter"
                  name="lang"
                  list="languages"
                  defaultValue={selectedLang}
                  dir="auto"
                  placeholder="Filter language..."
                  aria-label="Filter reels by language"
                  className="h-10 min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/30 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500"
                />
                <datalist id="languages">
                  {uniqueLanguages.map((language) => (
                    <option key={language} value={language} />
                  ))}
                </datalist>
                <button
                  type="submit"
                  className="h-10 shrink-0 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
                >
                  Filter
                </button>
              </form>

              {selectedLang && (
                <Link
                  href="/reel"
                  className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Clear
                </Link>
              )}

              <Link
                href="/reel/addreel"
                className="inline-flex h-10 items-center justify-center rounded-xl bg-teal-600 px-4 text-sm font-semibold text-white shadow-md shadow-teal-500/20 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
              >
                + Add Reel
              </Link>
            </div>
          </div>
        </section>

        <section className="mt-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0">
              <h2 className="break-words text-xl font-bold text-slate-900 dark:text-white">
                {selectedLang ? `${selectedLang} Reels` : "Latest Reels"}
              </h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                {filteredReels.length} reel
                {filteredReels.length === 1 ? "" : "s"} found
              </p>
            </div>

            {selectedLang && (
              <span className="hidden max-w-full break-words rounded-full bg-teal-100 px-3 py-1 text-xs font-semibold text-teal-700 dark:bg-teal-950/50 dark:text-teal-300 sm:inline-flex">
                Filtered: <bdi className="ml-1">{selectedLang}</bdi>
              </span>
            )}
          </div>

          {filteredReels.length === 0 ? (
            <div className="mt-6 rounded-3xl border border-dashed border-slate-300 bg-white/60 px-6 py-16 text-center dark:border-slate-700 dark:bg-slate-900/60">
              <div
                aria-hidden="true"
                className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-100 text-2xl dark:bg-teal-950/50"
              >
                🎬
              </div>
              <h2 className="mt-5 text-xl font-bold text-slate-900 dark:text-white">
                No reels found
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600 dark:text-slate-300">
                {selectedLang
                  ? `No reels have been shared for "${selectedLang}" yet.`
                  : "Be the first community member to share a reel."}
              </p>
              <Link
                href="/reel/addreel"
                className="mt-6 inline-flex rounded-xl bg-teal-600 px-5 py-3 text-sm font-semibold text-white hover:bg-teal-700"
              >
                Create a Reel
              </Link>
            </div>
          ) : (
            <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2 xl:gap-8">
              {filteredReels.map((reel) => (
                <ReelCard
                  key={reel._id}
                  reel={reel}
                  currentUserId={currentUserId}
                  currentUserRole={currentUserRole}
                  languages={languages}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
