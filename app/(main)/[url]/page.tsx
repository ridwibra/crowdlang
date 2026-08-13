import Link from "next/link";
import db from "@/utils/db";
import Language from "@/models/Language";
import Alphabet from "@/models/Alphabet";
import Essay from "@/models/Essay";
import User from "@/models/User";
import DeleteLanguageButton from "@/components/DeleteLanguageButton";
import AlphabetFormToggle from "@/components/AlphabetFormToggle";
import { getSession } from "@/lib/server";
import DeleteAlphabetButton from "@/components/DeleteAlphabetButton";
import EssayFormToggle from "@/components/EssayFormToggle";
import DeleteEssayButton from "@/components/DeleteEssayButton";

interface PageProps {
  params: Promise<{ url: string }>;
  searchParams: Promise<{ q?: string }>;
}

const MAX_ALPHABETS = 5;

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export default async function LanguageDetailPage({
  params,
  searchParams,
}: PageProps) {
  const { url } = await params;
  const { q } = await searchParams;

  const languageName = decodeURIComponent(url);

  const essaySearchQuery = typeof q === "string" ? q.trim().slice(0, 100) : "";

  const escapedEssaySearchQuery = escapeRegex(essaySearchQuery);

  await db.connect();

  const languageDoc = await Language.findOne({
    name: languageName,
  }).lean();

  if (!languageDoc) {
    return (
      <main className="mx-auto flex min-h-[60vh] max-w-7xl items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-md rounded-3xl border border-red-200 bg-red-50 p-8 text-center shadow-sm dark:border-red-900/60 dark:bg-red-950/30">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-100 text-2xl font-bold text-red-600 dark:bg-red-900/50 dark:text-red-300">
            !
          </div>

          <h1 className="mt-5 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Language not found
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
            This language may have been removed or the address may be incorrect.
          </p>

          <Link
            href="/"
            className="mt-6 inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
          >
            Return home
          </Link>
        </div>
      </main>
    );
  }

  const alphabetDocs = await Alphabet.find({
    language: languageDoc._id,
  })
    .sort({ createdAt: 1, _id: 1 })
    .limit(MAX_ALPHABETS)
    .lean();

  const essaySearchFilter = essaySearchQuery
    ? {
        language: languageDoc._id,
        status: "approved",
        $or: [
          {
            title: {
              $regex: escapedEssaySearchQuery,
              $options: "i",
            },
          },
          {
            category: {
              $regex: escapedEssaySearchQuery,
              $options: "i",
            },
          },
          {
            body: {
              $regex: escapedEssaySearchQuery,
              $options: "i",
            },
          },
          {
            translationTitle: {
              $regex: escapedEssaySearchQuery,
              $options: "i",
            },
          },
          {
            translationBody: {
              $regex: escapedEssaySearchQuery,
              $options: "i",
            },
          },
          {
            level: {
              $regex: escapedEssaySearchQuery,
              $options: "i",
            },
          },
          {
            tags: {
              $regex: escapedEssaySearchQuery,
              $options: "i",
            },
          },
        ],
      }
    : {
        language: languageDoc._id,
        // status: "approved",
      };

  const essaysDocs = await Essay.find(essaySearchFilter)
    .sort({ createdAt: -1, _id: -1 })
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
    .lean();

  const language = {
    _id: languageDoc._id.toString(),
    name: languageDoc.name,
    countries: languageDoc.countries || [],
  };

  const alphabets = alphabetDocs.map((alphabetDoc: any) => ({
    _id: alphabetDoc._id.toString(),
    name: alphabetDoc.name || "",
    letters: Array.isArray(alphabetDoc.letters)
      ? alphabetDoc.letters.map((letter: any) => ({
          character: letter.character,
          order: letter.order,
          ipa: letter.ipa || "",
          audioUrl: letter.audioUrl || "",
        }))
      : [],
  }));

  const essays = essaysDocs.map((essay: any) => ({
    _id: essay._id.toString(),
    title: essay.title,
    category: essay.category || "",
    body: essay.body || "",
    translationTitle: essay.translationTitle || "",
    translationBody: essay.translationBody || "",
    images: Array.isArray(essay.images)
      ? essay.images.map((image: any) => ({
          image_url: image.image_url,
          public_id: image.public_id || null,
        }))
      : [],
    status: essay.status || "",
    level: essay.level || "",
    tags: essay.tags || [],
    author: essay.author
      ? {
          _id: essay.author._id.toString(),
          name: essay.author.name,
          email: essay.author.email,
          avatar: essay.author.avatar || "",
        }
      : null,
    updatedAt: essay.updatedAt?.toISOString(),
  }));

  const session = await getSession();
  const role = session?.user?.role;
  const isStaff = role === "admin" || role === "staff";

  const canAddAlphabet = alphabets.length < MAX_ALPHABETS;
  const languagePath = `/${encodeURIComponent(language.name)}`;

  return (
    <main className="min-h-screen bg-slate-50 py-6 dark:bg-slate-950 sm:py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <nav className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-slate-950 dark:text-slate-400 dark:hover:text-white"
          >
            <span aria-hidden="true">←</span>
            All languages
          </Link>
        </nav>

        {/* Language header */}
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="h-2 bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600" />

          <div className="p-6 sm:p-8 lg:p-10">
            <div className="flex flex-col gap-8 xl:flex-row xl:items-start xl:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-100 text-xl font-bold text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300">
                    {language.name.charAt(0).toUpperCase()}
                  </div>

                  <span className="rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-indigo-700 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-300">
                    Language profile
                  </span>
                </div>

                <h1 className="mt-5 break-words text-4xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-5xl">
                  {language.name}
                </h1>

                <div className="mt-5 flex flex-wrap items-center gap-2">
                  <span className="mr-1 text-sm font-medium text-slate-500 dark:text-slate-400">
                    Spoken in
                  </span>

                  {language.countries.length > 0 ? (
                    language.countries.map((country: string) => (
                      <span
                        key={country}
                        className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                      >
                        {country}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-slate-500 dark:text-slate-400">
                      No countries listed
                    </span>
                  )}
                </div>
              </div>

              <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap xl:max-w-md xl:justify-end">
                <Link
                  href={`${languagePath}/addtable`}
                  className="inline-flex min-h-11 items-center justify-center rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 hover:shadow-md"
                >
                  <span className="mr-2 text-lg leading-none">+</span>
                  Add table entry
                </Link>

                <Link
                  href={`${languagePath}/editLanguage`}
                  className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                >
                  Edit language
                </Link>

                <DeleteLanguageButton id={language._id} name={language.name} />
              </div>
            </div>
          </div>
        </section>

        <div className="mt-8 grid gap-8 xl:grid-cols-[minmax(0,1fr)_19rem]">
          <div className="min-w-0 space-y-8">
            {/* Alphabets */}
            <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex flex-col gap-5 border-b border-slate-200 p-6 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-lg font-bold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                    A
                  </div>

                  <div>
                    <h2 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
                      Alphabets
                    </h2>

                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      Writing systems and character sets
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <span
                    className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                      alphabets.length === MAX_ALPHABETS
                        ? "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300"
                        : "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                    }`}
                  >
                    {alphabets.length} / {MAX_ALPHABETS} added
                  </span>

                  <AlphabetFormToggle
                    language={language}
                    alphabet={null}
                    disabled={!canAddAlphabet}
                    disabledMessage={`A language can have up to ${MAX_ALPHABETS} alphabets.`}
                  />
                </div>
              </div>

              <div className="p-6">
                {alphabets.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center dark:border-slate-700 dark:bg-slate-800/60">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-xl font-bold text-slate-400 shadow-sm dark:bg-slate-800">
                      A
                    </div>

                    <h3 className="mt-4 font-semibold text-slate-900 dark:text-white">
                      No alphabets available
                    </h3>

                    <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">
                      No writing system has been added for this language yet.
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-5 md:grid-cols-2">
                    {alphabets.map((alphabet, alphabetIndex) => (
                      <article
                        key={alphabet._id}
                        className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/70 transition hover:border-emerald-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-800/40"
                      >
                        <div className="border-b border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-xs font-bold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                                  {alphabetIndex + 1}
                                </span>

                                <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                                  Alphabet
                                </p>
                              </div>

                              <h3 className="mt-3 break-words text-xl font-bold text-slate-950 dark:text-white">
                                {alphabet.name ||
                                  `Alphabet ${alphabetIndex + 1}`}
                              </h3>
                            </div>

                            <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                              {alphabet.letters.length}{" "}
                              {alphabet.letters.length === 1
                                ? "letter"
                                : "letters"}
                            </span>
                          </div>
                        </div>

                        <div className="p-5">
                          {alphabet.letters.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {[...alphabet.letters]
                                .sort(
                                  (first, second) => first.order - second.order,
                                )
                                .map((letter) => (
                                  <div
                                    key={`${alphabet._id}-${letter.order}`}
                                    title={
                                      letter.ipa
                                        ? `IPA pronunciation: ${letter.ipa}`
                                        : undefined
                                    }
                                    className="flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 px-2 text-base font-bold text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200"
                                  >
                                    {letter.character}
                                  </div>
                                ))}
                            </div>
                          ) : (
                            <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
                              No letters have been added to this alphabet.
                            </div>
                          )}

                          <div className="mt-5 flex flex-wrap gap-3 border-t border-slate-200 pt-4 dark:border-slate-800">
                            <AlphabetFormToggle
                              language={language}
                              alphabet={alphabet}
                            />
                            <DeleteAlphabetButton id={alphabet._id} />
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                )}

                {isStaff && !canAddAlphabet && (
                  <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-500/20 dark:bg-amber-500/10">
                    <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                      This language has reached the maximum of {MAX_ALPHABETS}{" "}
                      alphabets. Delete one before adding another.
                    </p>
                  </div>
                )}
              </div>
            </section>

            {/* Essays */}
            <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="border-b border-slate-200 p-6 dark:border-slate-800">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-lg text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">
                      ✦
                    </div>

                    <div>
                      <h2 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
                        Essays
                      </h2>

                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        Reading material and translations
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <span className="rounded-full bg-violet-50 px-3 py-1.5 text-xs font-bold text-violet-700 dark:bg-violet-500/10 dark:text-violet-300">
                      {essaySearchQuery
                        ? `${essays.length} result${
                            essays.length === 1 ? "" : "s"
                          }`
                        : `${essays.length} ${
                            essays.length === 1 ? "essay" : "essays"
                          }`}
                    </span>

                    <EssayFormToggle language={language} />
                  </div>
                </div>

                <form
                  action={languagePath}
                  method="GET"
                  className="mt-6 flex flex-col gap-3 sm:flex-row"
                >
                  <div className="relative flex-1">
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg text-slate-400"
                    >
                      ⌕
                    </span>

                    <input
                      type="search"
                      name="q"
                      defaultValue={essaySearchQuery}
                      placeholder="Search title, text, translation, category, level, or tags..."
                      className="min-h-11 w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500"
                    />
                  </div>

                  <button
                    type="submit"
                    className="inline-flex min-h-11 items-center justify-center rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700"
                  >
                    Search
                  </button>

                  {essaySearchQuery && (
                    <Link
                      href={languagePath}
                      className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                    >
                      Clear
                    </Link>
                  )}
                </form>

                {essaySearchQuery && (
                  <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                    Showing results for{" "}
                    <span className="font-semibold text-slate-700 dark:text-slate-200">
                      “{essaySearchQuery}”
                    </span>
                  </p>
                )}
              </div>

              <div className="p-6">
                {essays.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center dark:border-slate-700 dark:bg-slate-800/60">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-xl text-slate-400 shadow-sm dark:bg-slate-800">
                      {essaySearchQuery ? "⌕" : "✦"}
                    </div>

                    <h3 className="mt-4 font-semibold text-slate-900 dark:text-white">
                      {essaySearchQuery
                        ? "No matching essays found"
                        : "No essays yet"}
                    </h3>

                    <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">
                      {essaySearchQuery
                        ? `No essays matched “${essaySearchQuery}”. Try a title, tag, category, or word from the original text or translation.`
                        : "Essays, translations, and images added for this language will appear here."}
                    </p>

                    {essaySearchQuery && (
                      <Link
                        href={languagePath}
                        className="mt-5 inline-flex rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                      >
                        Clear essay search
                      </Link>
                    )}
                  </div>
                ) : (
                  <div className="space-y-6">
                    {essays.map((essay) => (
                      <article
                        key={essay._id}
                        className="overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:border-slate-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
                      >
                        <div className="p-5 sm:p-6">
                          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                {essay.category && (
                                  <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300">
                                    {essay.category}
                                  </span>
                                )}

                                {essay.level && (
                                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                    {essay.level}
                                  </span>
                                )}

                                <span
                                  className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                                    essay.status === "approved"
                                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                                      : "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300"
                                  }`}
                                >
                                  {essay.status}
                                </span>
                              </div>

                              <h3 className="mt-4 break-words text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
                                {essay.title}
                              </h3>

                              {essay.author && (
                                <div className="mt-3 flex items-center gap-2.5 text-sm text-slate-500 dark:text-slate-400">
                                  {essay.author.avatar ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                      src={essay.author.avatar}
                                      alt=""
                                      className="h-7 w-7 rounded-full border border-slate-200 object-cover dark:border-slate-700"
                                    />
                                  ) : (
                                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                      {essay.author.name
                                        ?.charAt(0)
                                        .toUpperCase() || "?"}
                                    </div>
                                  )}

                                  <span>
                                    By{" "}
                                    <span className="font-medium text-slate-700 dark:text-slate-200">
                                      {essay.author.name}
                                    </span>
                                  </span>
                                </div>
                              )}
                            </div>

                            <EssayFormToggle
                              language={language}
                              essay={essay}
                            />
                          </div>

                          <div className="mt-6 grid gap-6 xl:grid-cols-2">
                            <section>
                              <p className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                                Original text
                              </p>

                              <div
                                className="prose prose-slate max-w-none text-sm leading-7 dark:prose-invert dark:prose-p:text-slate-300"
                                dangerouslySetInnerHTML={{
                                  __html: essay.body,
                                }}
                              />
                            </section>

                            <section className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4 dark:border-indigo-500/15 dark:bg-indigo-500/5">
                              <p className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-indigo-700 dark:text-indigo-300">
                                {essay.translationTitle ||
                                  "English translation"}
                              </p>

                              <div
                                className="prose prose-slate max-w-none text-sm leading-7 dark:prose-invert dark:prose-p:text-slate-300"
                                dangerouslySetInnerHTML={{
                                  __html: essay.translationBody,
                                }}
                              />
                            </section>
                          </div>

                          {essay.images.length > 0 && (
                            <div className="mt-6">
                              <p className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                                Images
                              </p>

                              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                                {essay.images.map((image: any) => (
                                  <div
                                    key={image.public_id ?? image.image_url}
                                    className="group aspect-square overflow-hidden rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800"
                                  >
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                      src={image.image_url}
                                      alt={`Image for ${essay.title}`}
                                      className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                                    />
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {essay.tags.length > 0 && (
                            <div className="mt-6 flex flex-wrap gap-2">
                              {essay.tags.map((tag: string) => (
                                <span
                                  key={tag}
                                  className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                                >
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          )}

                          <div className="mt-6 flex flex-col gap-4 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {essay.updatedAt
                                ? `Updated ${new Date(
                                    essay.updatedAt,
                                  ).toLocaleDateString()}`
                                : "No update date available"}
                            </p>

                            <DeleteEssayButton id={essay._id} />
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* Sidebar */}
          <aside className="h-fit rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 xl:sticky xl:top-6">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
              Overview
            </p>

            <dl className="mt-5 space-y-5">
              <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-5 dark:border-slate-800">
                <dt className="text-sm text-slate-500 dark:text-slate-400">
                  Countries
                </dt>

                <dd className="text-lg font-bold text-slate-900 dark:text-white">
                  {language.countries.length}
                </dd>
              </div>

              <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-5 dark:border-slate-800">
                <dt className="text-sm text-slate-500 dark:text-slate-400">
                  Alphabets
                </dt>

                <dd>
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                    {alphabets.length} / {MAX_ALPHABETS}
                  </span>
                </dd>
              </div>

              <div className="flex items-center justify-between gap-4">
                <dt className="text-sm text-slate-500 dark:text-slate-400">
                  {essaySearchQuery ? "Search results" : "Essays"}
                </dt>

                <dd className="text-lg font-bold text-slate-900 dark:text-white">
                  {essays.length}
                </dd>
              </div>
            </dl>

            {isStaff && (
              <div className="mt-7 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/20 dark:bg-amber-500/10">
                <p className="text-sm font-bold text-amber-800 dark:text-amber-200">
                  Staff controls enabled
                </p>

                <p className="mt-1 text-xs leading-5 text-amber-700 dark:text-amber-300">
                  You can add, edit, and remove alphabets and essays from this
                  page.
                </p>
              </div>
            )}
          </aside>
        </div>
      </div>
    </main>
  );
}
