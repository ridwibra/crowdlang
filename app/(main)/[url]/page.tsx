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
import LanguageStructure from "@/models/LanguageStructure";
import DeleteLanguageStructureButton from "@/components/DeleteLanguageStructureButton";
import LanguageStructureFormToggle from "@/components/LanguageStructureFormToggle";

interface PageProps {
  params: Promise<{ url: string }>;
  searchParams: Promise<{ q?: string }>;
}

const MAX_ALPHABETS = 5;
const MAX_WORD_ORDERS = 1;
const MAX_LANGUAGE_STRUCTURES = 5;

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

  const languageStructureDocs = await LanguageStructure.find({
    language: languageDoc._id,
  })
    .sort({ createdAt: 1, _id: 1 })
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
      select: "name email image avatar",
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

  const languageStructures = languageStructureDocs.map((structureDoc: any) => ({
    _id: structureDoc._id.toString(),

    writingDirections: Array.isArray(structureDoc.writingDirections)
      ? structureDoc.writingDirections
      : [],

    wordOrders: Array.isArray(structureDoc.wordOrders)
      ? structureDoc.wordOrders.map((wordOrder: any) => ({
          _id: wordOrder._id.toString(),
          label: wordOrder.label || "",
          constituents: Array.isArray(wordOrder.constituents)
            ? wordOrder.constituents
            : [],
          notes: wordOrder.notes || "",
        }))
      : [],

    status: structureDoc.status || "published",
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
          name: essay.author.name || "Unknown contributor",
          email: essay.author.email || "",
          avatar:
            (typeof essay.author.image === "string"
              ? essay.author.image.trim()
              : "") ||
            (typeof essay.author.avatar === "string"
              ? essay.author.avatar.trim()
              : ""),
        }
      : null,
    updatedAt: essay.updatedAt?.toISOString(),
  }));

  const session = await getSession();
  const role = session?.user?.role;
  const isStaff = role === "admin" || role === "staff";
  const isSignedIn = Boolean(session?.user);

  const canAddAlphabet = alphabets.length < MAX_ALPHABETS;

  const canAddLanguageStructure =
    languageStructures.length < MAX_LANGUAGE_STRUCTURES;

  const languagePath = `/${encodeURIComponent(language.name)}`;

  const overviewSession = await getSession();
  const overviewUser = overviewSession?.user?.email
    ? await User.findOne({ email: overviewSession.user.email }).select("role")
    : null;

  const canViewOverview =
    overviewUser?.role === "admin" || overviewUser?.role === "root";
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

              {isSignedIn && (
                <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap xl:max-w-md xl:justify-end">
                  {/* <Link
                    href={`${languagePath}/addtable`}
                    className="inline-flex min-h-11 items-center justify-center rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 hover:shadow-md"
                  >
                    <span className="mr-2 text-lg leading-none">+</span>
                    Add table entry
                  </Link> */}

                  <Link
                    href={`${languagePath}/editLanguage`}
                    className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                  >
                    Edit language
                  </Link>

                  <DeleteLanguageButton
                    id={language._id}
                    name={language.name}
                  />
                </div>
              )}
            </div>
          </div>
        </section>

        {!isSignedIn && (
          <div className="mt-5 rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-800 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-200">
            Sign in to add or suggest language content.
          </div>
        )}

        <div className="mt-8 grid gap-8 xl:grid-cols-[minmax(0,1fr)_19rem]">
          <div className="min-w-0 space-y-8">
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

                  {isSignedIn && (
                    <AlphabetFormToggle
                      language={language}
                      alphabet={null}
                      disabled={!canAddAlphabet}
                      disabledMessage={`A language can have up to ${MAX_ALPHABETS} alphabets.`}
                    />
                  )}
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

                          {isSignedIn && (
                            <div className="mt-5 flex flex-wrap gap-3 border-t border-slate-200 pt-4 dark:border-slate-800">
                              <AlphabetFormToggle
                                language={language}
                                alphabet={alphabet}
                              />

                              <DeleteAlphabetButton id={alphabet._id} />
                            </div>
                          )}
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
            <section className="min-w-0 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              {/* Section heading and creation form */}
              <div className="border-b border-slate-200 p-6 dark:border-slate-800">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex min-w-0 items-start gap-3">
                    <div
                      aria-hidden="true"
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-100 text-lg font-bold text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300"
                    >
                      ⇄
                    </div>

                    <div className="min-w-0">
                      <h2 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
                        Language Structure
                      </h2>

                      <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
                        Writing direction and sentence-order patterns
                      </p>
                    </div>
                  </div>

                  <span
                    className={`w-fit shrink-0 rounded-full px-3 py-1.5 text-xs font-bold ${
                      languageStructures.length >= MAX_LANGUAGE_STRUCTURES
                        ? "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300"
                        : "bg-cyan-50 text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-300"
                    }`}
                  >
                    {languageStructures.length} / {MAX_LANGUAGE_STRUCTURES}{" "}
                    records
                  </span>
                </div>

                {/* Full-width creation form below the section heading */}
                {isSignedIn && (
                  <div className="mt-5 min-w-0 w-full">
                    <LanguageStructureFormToggle
                      language={language}
                      languageStructure={null}
                      disabled={!canAddLanguageStructure}
                      disabledMessage={`A language can have up to ${MAX_LANGUAGE_STRUCTURES} structures.`}
                    />
                  </div>
                )}
              </div>

              <div className="min-w-0 p-6">
                {languageStructures.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center dark:border-slate-700 dark:bg-slate-800/60">
                    <div
                      aria-hidden="true"
                      className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-xl font-bold text-slate-400 shadow-sm dark:bg-slate-800"
                    >
                      ⇄
                    </div>

                    <h3 className="mt-4 font-semibold text-slate-900 dark:text-white">
                      No language structure details available
                    </h3>

                    <p className="mx-auto mt-2 max-w-md text-sm leading-7 text-slate-500 dark:text-slate-400">
                      Writing directions and sentence-order patterns have not
                      been added for this language yet.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {languageStructures.map(
                      (languageStructure, structureIndex) => (
                        <article
                          key={languageStructure._id}
                          className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-800/40"
                        >
                          {/* Structure heading, full-width edit form, and delete control */}
                          <div className="flex min-w-0 flex-col gap-4 border-b border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-cyan-100 text-xs font-bold text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300">
                                  {structureIndex + 1}
                                </span>

                                <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                                  Language structure
                                </p>

                                <span
                                  className={`rounded-full px-2.5 py-1 text-xs font-bold capitalize ${
                                    languageStructure.status === "published"
                                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                                      : languageStructure.status === "archived"
                                        ? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                                        : "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300"
                                  }`}
                                >
                                  {languageStructure.status}
                                </span>
                              </div>

                              <h3 className="mt-3 break-words text-xl font-bold text-slate-950 dark:text-white">
                                Structure {structureIndex + 1}
                              </h3>

                              <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
                                Writing directions and sentence-order patterns.
                              </p>
                            </div>

                            {isSignedIn && (
                              <div className="flex min-w-0 w-full flex-col items-start gap-3">
                                <LanguageStructureFormToggle
                                  language={language}
                                  languageStructure={languageStructure}
                                />

                                <DeleteLanguageStructureButton
                                  id={languageStructure._id}
                                />
                              </div>
                            )}
                          </div>

                          <div className="min-w-0 space-y-6 p-5">
                            {/* Writing directions */}
                            <div>
                              <div className="flex flex-wrap items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <h4 className="text-sm font-bold uppercase tracking-[0.14em] text-slate-600 dark:text-slate-300">
                                    Writing directions
                                  </h4>

                                  <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
                                    The directions in which text is written.
                                  </p>
                                </div>

                                <span className="shrink-0 rounded-full bg-fuchsia-50 px-2.5 py-1 text-xs font-bold text-fuchsia-700 dark:bg-fuchsia-500/10 dark:text-fuchsia-300">
                                  {languageStructure.writingDirections.length}{" "}
                                  recorded
                                </span>
                              </div>

                              {languageStructure.writingDirections.length >
                              0 ? (
                                <div className="mt-4 flex flex-wrap gap-2">
                                  {languageStructure.writingDirections.map(
                                    (writingDirection: string) => (
                                      <span
                                        key={writingDirection}
                                        className="max-w-full break-words rounded-xl border border-fuchsia-200 bg-fuchsia-50 px-3 py-2 text-sm font-semibold text-fuchsia-800 dark:border-fuchsia-500/20 dark:bg-fuchsia-500/10 dark:text-fuchsia-200"
                                      >
                                        {writingDirection
                                          .split("-")
                                          .map(
                                            (part) =>
                                              part.charAt(0).toUpperCase() +
                                              part.slice(1),
                                          )
                                          .join(" ")}
                                      </span>
                                    ),
                                  )}
                                </div>
                              ) : (
                                <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-white px-4 py-5 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
                                  No writing direction has been recorded.
                                </div>
                              )}
                            </div>

                            {/* Sentence-order patterns */}
                            <div className="border-t border-slate-200 pt-6 dark:border-slate-800">
                              <h4 className="text-sm font-bold uppercase tracking-[0.14em] text-slate-600 dark:text-slate-300">
                                Sentence-order patterns
                              </h4>

                              <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
                                Read the sentence parts in sequence. This
                                describes grammatical order, not the direction
                                of writing.
                              </p>

                              {languageStructure.wordOrders.length > 0 ? (
                                <div className="mt-4 space-y-4">
                                  {languageStructure.wordOrders.map(
                                    (
                                      wordOrder: {
                                        _id: string;
                                        label: string;
                                        constituents: string[];
                                        notes: string;
                                      },
                                      wordOrderIndex: number,
                                    ) => (
                                      <article
                                        key={wordOrder._id}
                                        className="min-w-0 rounded-2xl border border-cyan-200 bg-cyan-50/60 p-5 dark:border-cyan-500/20 dark:bg-cyan-500/5"
                                      >
                                        <div className="flex items-start justify-between gap-4">
                                          <div className="min-w-0">
                                            <p className="text-xs font-bold uppercase tracking-[0.14em] text-cyan-700 dark:text-cyan-300">
                                              Pattern {wordOrderIndex + 1}
                                            </p>

                                            {/* <h5
                                              dir="auto"
                                              className="mt-2 break-words text-lg font-bold text-slate-950 dark:text-white"
                                            >
                                              {wordOrder.label ||
                                                `Sentence order ${wordOrderIndex + 1}`}
                                            </h5> */}
                                          </div>

                                          <span className="shrink-0 rounded-lg bg-white px-2.5 py-1.5 text-xs font-bold text-cyan-700 shadow-sm dark:bg-slate-900 dark:text-cyan-300">
                                            {wordOrder.constituents.length}{" "}
                                            {wordOrder.constituents.length === 1
                                              ? "part"
                                              : "parts"}
                                          </span>
                                        </div>

                                        {wordOrder.constituents.length > 0 ? (
                                          <ol
                                            dir="ltr"
                                            className="mt-5 flex flex-wrap items-center gap-2"
                                          >
                                            {wordOrder.constituents.map(
                                              (
                                                constituent: string,
                                                constituentIndex: number,
                                              ) => (
                                                <li
                                                  key={`${wordOrder._id}-${constituentIndex}`}
                                                  className="max-w-full break-words rounded-xl border border-cyan-200 bg-white px-3 py-2 text-sm font-semibold text-cyan-800 dark:border-cyan-500/20 dark:bg-slate-900 dark:text-cyan-200"
                                                >
                                                  <span className="mr-2 text-cyan-500 dark:text-cyan-400">
                                                    {constituentIndex + 1}.
                                                  </span>

                                                  {constituent
                                                    .split("-")
                                                    .map(
                                                      (part) =>
                                                        part
                                                          .charAt(0)
                                                          .toUpperCase() +
                                                        part.slice(1),
                                                    )
                                                    .join(" ")}
                                                </li>
                                              ),
                                            )}
                                          </ol>
                                        ) : (
                                          <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
                                            No sentence parts were added to this
                                            pattern.
                                          </p>
                                        )}

                                        {wordOrder.notes && (
                                          <div className="mt-5 border-t border-cyan-200 pt-4 dark:border-cyan-500/20">
                                            <p className="text-xs font-semibold text-cyan-700 dark:text-cyan-300">
                                              Explanation or example
                                            </p>

                                            <p
                                              dir="auto"
                                              className="mt-2 whitespace-pre-wrap break-words text-sm leading-7 text-slate-600 dark:text-slate-300"
                                            >
                                              {wordOrder.notes}
                                            </p>
                                          </div>
                                        )}
                                      </article>
                                    ),
                                  )}
                                </div>
                              ) : (
                                <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-white px-4 py-5 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
                                  No sentence-order pattern has been recorded.
                                </div>
                              )}
                            </div>
                          </div>
                        </article>
                      ),
                    )}
                  </div>
                )}

                {isSignedIn && !canAddLanguageStructure && (
                  <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-500/20 dark:bg-amber-500/10">
                    <p className="text-sm font-medium leading-6 text-amber-800 dark:text-amber-200">
                      This language has reached the maximum of{" "}
                      {MAX_LANGUAGE_STRUCTURES} structure records. Edit an
                      existing record, or delete one you have permission to
                      manage before adding another.
                    </p>
                  </div>
                )}
              </div>
            </section>
            <section
              aria-labelledby="essays-heading"
              className="min-w-0 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
            >
              {/* Header, creation form, and search */}
              <div className="border-b border-slate-200 bg-gradient-to-br from-violet-50 via-white to-indigo-50/50 p-5 dark:border-slate-800 dark:from-violet-500/10 dark:via-slate-900 dark:to-indigo-500/5 sm:p-7">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-600 dark:text-violet-400">
                      Language, culture &amp; stories
                    </p>

                    <h2
                      id="essays-heading"
                      className="mt-2 text-3xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-4xl"
                    >
                      Essays
                    </h2>

                    <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 dark:text-slate-300">
                      Discover original writing in{" "}
                      <bdi className="font-medium">{language.name}</bdi>,
                      alongside English translations, contributor perspectives,
                      and images.
                    </p>
                  </div>

                  <span className="inline-flex w-fit shrink-0 items-center rounded-full border border-violet-200 bg-white px-3 py-1.5 text-xs font-semibold text-violet-700 dark:border-violet-500/20 dark:bg-violet-500/10 dark:text-violet-300">
                    {essays.length}{" "}
                    {essaySearchQuery
                      ? essays.length === 1
                        ? "result"
                        : "results"
                      : essays.length === 1
                        ? "essay"
                        : "essays"}
                  </span>
                </div>

                {isSignedIn && (
                  <div className="mt-5 min-w-0">
                    <EssayFormToggle language={language} />
                  </div>
                )}

                <form
                  action={languagePath}
                  method="GET"
                  role="search"
                  aria-label="Search essays"
                  className="mt-6 flex flex-col gap-3 sm:flex-row"
                >
                  <div className="min-w-0 flex-1">
                    <label htmlFor="essay-search" className="sr-only">
                      Search essays by title, text, translation, category,
                      level, or tags
                    </label>

                    <input
                      id="essay-search"
                      type="search"
                      name="q"
                      dir="auto"
                      defaultValue={essaySearchQuery}
                      placeholder="Search titles, stories, translations, or topics..."
                      className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 dark:border-slate-700 dark:bg-slate-950/50 dark:text-white dark:placeholder:text-slate-500"
                    />
                  </div>

                  <button
                    type="submit"
                    className="inline-flex min-h-12 items-center justify-center rounded-xl bg-violet-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
                  >
                    Search essays
                  </button>

                  {essaySearchQuery && (
                    <Link
                      href={languagePath}
                      className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 dark:focus:ring-offset-slate-900"
                    >
                      Clear
                    </Link>
                  )}
                </form>

                {essaySearchQuery && (
                  <p
                    role="status"
                    className="mt-3 break-words text-sm text-slate-600 dark:text-slate-400"
                  >
                    Search results for{" "}
                    <bdi className="font-medium text-violet-700 dark:text-violet-300">
                      “{essaySearchQuery}”
                    </bdi>
                  </p>
                )}
              </div>

              {/* Essay list */}
              <div className="bg-slate-50/60 p-4 dark:bg-slate-950/20 sm:p-6">
                {essays.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-14 text-center dark:border-slate-700 dark:bg-slate-900 sm:px-8">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-600 dark:text-violet-400">
                      {essaySearchQuery ? "Search results" : "The collection"}
                    </p>

                    <h3 className="mt-3 text-xl font-bold text-slate-900 dark:text-white">
                      {essaySearchQuery
                        ? "No matching essays"
                        : "Stories begin with a contribution"}
                    </h3>

                    <p className="mx-auto mt-3 max-w-lg text-sm leading-7 text-slate-500 dark:text-slate-400">
                      {essaySearchQuery
                        ? "Try a different title, topic, category, or phrase from the original text or translation."
                        : `No essays are available for ${language.name} yet. Original writing, translations, and accompanying images will appear here.`}
                    </p>

                    {essaySearchQuery && (
                      <Link
                        href={languagePath}
                        className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
                      >
                        View all essays
                      </Link>
                    )}
                  </div>
                ) : (
                  <div className="space-y-8">
                    {essays.map((essay) => {
                      const authorName =
                        essay.author?.name || "Unknown contributor";

                      const essayImages = essay.images || [];
                      const essayTags = essay.tags || [];

                      const updatedDate = essay.updatedAt
                        ? new Date(essay.updatedAt)
                        : null;

                      const hasValidUpdatedDate =
                        updatedDate !== null &&
                        !Number.isNaN(updatedDate.getTime());

                      return (
                        <article
                          key={essay._id}
                          aria-labelledby={`essay-title-${essay._id}`}
                          className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:rounded-3xl"
                        >
                          {/* Title and contributor */}
                          <header className="p-5 sm:p-7">
                            {(essay.category || essay.level) && (
                              <div className="mb-4 flex flex-wrap items-center gap-2">
                                {essay.category && (
                                  <span
                                    dir="auto"
                                    className="max-w-full break-words rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700 dark:bg-violet-500/10 dark:text-violet-300"
                                  >
                                    {essay.category}
                                  </span>
                                )}

                                {essay.level && (
                                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium capitalize text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                    {essay.level}
                                  </span>
                                )}
                              </div>
                            )}

                            <h3
                              id={`essay-title-${essay._id}`}
                              dir="auto"
                              className="break-words text-start text-2xl font-bold leading-snug tracking-tight text-slate-950 dark:text-white sm:text-3xl"
                            >
                              {essay.title || "Untitled essay"}
                            </h3>

                            {essay.translationTitle && (
                              <p
                                lang="en"
                                dir="ltr"
                                className="mt-3 break-words text-base leading-7 text-slate-500 dark:text-slate-400 sm:text-lg"
                              >
                                {essay.translationTitle}
                              </p>
                            )}

                            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-4">
                              <div className="flex min-w-0 items-center gap-3">
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-violet-50 dark:border-slate-700 dark:bg-violet-500/10">
                                  {essay.author?.avatar ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                      src={essay.author.avatar}
                                      alt=""
                                      referrerPolicy="no-referrer"
                                      loading="lazy"
                                      className="h-full w-full object-cover"
                                    />
                                  ) : (
                                    <span
                                      aria-hidden="true"
                                      className="text-sm font-bold text-violet-700 dark:text-violet-300"
                                    >
                                      {authorName.charAt(0).toUpperCase()}
                                    </span>
                                  )}
                                </div>

                                <div className="min-w-0">
                                  <p className="text-xs text-slate-500 dark:text-slate-400">
                                    Written by
                                  </p>
                                  <p className="mt-0.5 break-words text-sm font-semibold text-slate-800 dark:text-slate-200">
                                    <bdi>{authorName}</bdi>
                                  </p>
                                </div>
                              </div>

                              <span className="text-xs text-slate-500 dark:text-slate-400">
                                <bdi>{language.name}</bdi> · English translation
                              </span>
                            </div>
                          </header>

                          {/* Keep the editor outside narrow header wrappers */}
                          {isSignedIn && (
                            <div className="min-w-0 border-y border-slate-200 bg-slate-50/60 p-5 dark:border-slate-800 dark:bg-slate-800/20 sm:p-7">
                              <EssayFormToggle
                                language={language}
                                essay={essay}
                              />
                            </div>
                          )}

                          {/* Original and translation */}
                          <div className="grid min-w-0 gap-8 p-5 sm:p-7 2xl:grid-cols-2 2xl:gap-10">
                            <section
                              aria-labelledby={`essay-original-${essay._id}`}
                              className="min-w-0"
                            >
                              <div className="mb-5 flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3 dark:border-slate-800">
                                <h4
                                  id={`essay-original-${essay._id}`}
                                  className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400"
                                >
                                  Original essay
                                </h4>

                                <span className="text-xs font-medium text-violet-700 dark:text-violet-300">
                                  <bdi>{language.name}</bdi>
                                </span>
                              </div>

                              {essay.body?.trim() ? (
                                <div
                                  dir="auto"
                                  className="prose prose-slate mx-auto max-w-[68ch] break-words text-start text-base leading-8 prose-headings:leading-snug prose-headings:tracking-tight prose-p:my-5 prose-a:break-words prose-a:text-violet-700 prose-blockquote:border-violet-300 prose-img:h-auto prose-img:max-w-full prose-img:rounded-xl prose-pre:overflow-x-auto dark:prose-invert dark:prose-a:text-violet-300 [&_table]:block [&_table]:max-w-full [&_table]:overflow-x-auto"
                                  dangerouslySetInnerHTML={{
                                    __html: essay.body,
                                  }}
                                />
                              ) : (
                                <p className="text-sm italic leading-7 text-slate-400 dark:text-slate-500">
                                  No original text has been provided.
                                </p>
                              )}
                            </section>

                            <section
                              lang="en"
                              dir="ltr"
                              aria-labelledby={`essay-translation-${essay._id}`}
                              className="min-w-0 rounded-2xl bg-indigo-50/50 p-4 dark:bg-indigo-500/5 sm:p-5"
                            >
                              <div className="mb-5 border-b border-indigo-200/70 pb-3 dark:border-indigo-500/20">
                                <h4
                                  id={`essay-translation-${essay._id}`}
                                  className="text-xs font-semibold uppercase tracking-[0.14em] text-indigo-700 dark:text-indigo-300"
                                >
                                  English translation
                                </h4>
                              </div>

                              {essay.translationBody?.trim() ? (
                                <div
                                  className="prose prose-slate mx-auto max-w-[68ch] break-words text-base leading-8 prose-headings:leading-snug prose-headings:tracking-tight prose-p:my-5 prose-a:break-words prose-a:text-indigo-700 prose-blockquote:border-indigo-300 prose-img:h-auto prose-img:max-w-full prose-img:rounded-xl prose-pre:overflow-x-auto dark:prose-invert dark:prose-a:text-indigo-300 [&_table]:block [&_table]:max-w-full [&_table]:overflow-x-auto"
                                  dangerouslySetInnerHTML={{
                                    __html: essay.translationBody,
                                  }}
                                />
                              ) : (
                                <p className="text-sm italic leading-7 text-slate-500 dark:text-slate-400">
                                  An English translation has not been added yet.
                                </p>
                              )}
                            </section>
                          </div>

                          {/* Images */}
                          {essayImages.length > 0 && (
                            <section
                              aria-labelledby={`essay-images-${essay._id}`}
                              className="border-t border-slate-100 px-5 py-6 dark:border-slate-800 sm:px-7"
                            >
                              <div className="mb-4 flex items-center justify-between gap-3">
                                <h4
                                  id={`essay-images-${essay._id}`}
                                  className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400"
                                >
                                  In pictures
                                </h4>

                                <span className="text-xs text-slate-500 dark:text-slate-400">
                                  {essayImages.length}{" "}
                                  {essayImages.length === 1
                                    ? "image"
                                    : "images"}
                                </span>
                              </div>

                              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                {essayImages.map(
                                  (
                                    image: {
                                      image_url: string;
                                      public_id: string | null;
                                    },
                                    imageIndex: number,
                                  ) => (
                                    <figure
                                      key={`${
                                        image.public_id || image.image_url
                                      }-${imageIndex}`}
                                      className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800"
                                    >
                                      <a
                                        href={image.image_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        aria-label={`Open image ${
                                          imageIndex + 1
                                        } for ${
                                          essay.title || "this essay"
                                        } in a new tab`}
                                        className="group flex h-56 items-center justify-center overflow-hidden p-3 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-violet-500 sm:h-64"
                                      >
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                          src={image.image_url}
                                          alt={`Accompanying image ${
                                            imageIndex + 1
                                          } for ${essay.title || "this essay"}`}
                                          loading="lazy"
                                          decoding="async"
                                          className="h-full w-full object-contain transition duration-300 group-hover:scale-[1.02]"
                                        />
                                      </a>

                                      <figcaption className="flex items-center justify-between gap-3 border-t border-slate-200 bg-white px-4 py-3 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
                                        <span>Image {imageIndex + 1}</span>
                                        <span>Open image in a new tab ↗</span>
                                      </figcaption>
                                    </figure>
                                  ),
                                )}
                              </div>
                            </section>
                          )}

                          {/* Topics */}
                          {essayTags.length > 0 && (
                            <section
                              aria-labelledby={`essay-tags-${essay._id}`}
                              className="border-t border-slate-100 px-5 py-5 dark:border-slate-800 sm:px-7"
                            >
                              <h4
                                id={`essay-tags-${essay._id}`}
                                className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400"
                              >
                                Explore related topics
                              </h4>

                              <div className="flex flex-wrap gap-2">
                                {essayTags.map(
                                  (tag: string, tagIndex: number) => (
                                    <Link
                                      key={`${tag}-${tagIndex}`}
                                      href={`${languagePath}?q=${encodeURIComponent(tag)}`}
                                      aria-label={`Search essays for ${tag}`}
                                      className="max-w-full break-words rounded-lg border border-violet-100 bg-violet-50/70 px-3 py-2 text-xs font-medium text-violet-700 transition hover:border-violet-300 hover:bg-violet-100 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 dark:border-violet-500/15 dark:bg-violet-500/10 dark:text-violet-300 dark:hover:bg-violet-500/20 dark:focus:ring-offset-slate-900"
                                    >
                                      <bdi>#{tag}</bdi>
                                    </Link>
                                  ),
                                )}
                              </div>
                            </section>
                          )}

                          {/* Date and delete */}
                          <footer className="flex flex-col gap-4 border-t border-slate-200 bg-slate-50/80 px-5 py-4 dark:border-slate-800 dark:bg-slate-800/30 sm:flex-row sm:items-center sm:justify-between sm:px-7">
                            <p className="text-xs leading-6 text-slate-500 dark:text-slate-400">
                              {hasValidUpdatedDate && updatedDate ? (
                                <>
                                  Updated{" "}
                                  <time
                                    dateTime={updatedDate.toISOString()}
                                    className="font-medium text-slate-600 dark:text-slate-300"
                                  >
                                    {updatedDate.toLocaleDateString("en-US", {
                                      month: "short",
                                      day: "numeric",
                                      year: "numeric",
                                      timeZone: "UTC",
                                    })}
                                  </time>
                                </>
                              ) : (
                                "Update date unavailable"
                              )}
                            </p>

                            {isSignedIn && (
                              <div className="self-start sm:self-auto">
                                <DeleteEssayButton id={essay._id} />
                              </div>
                            )}
                          </footer>
                        </article>
                      );
                    })}
                  </div>
                )}
              </div>
            </section>
          </div>
          <aside
            aria-labelledby="language-overview-heading"
            className="min-w-0 h-fit overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 xl:sticky xl:top-6"
          >
            {/* Public overview header */}
            <div className="border-b border-slate-200 bg-gradient-to-br from-indigo-50 via-white to-violet-50/50 p-5 dark:border-slate-800 dark:from-indigo-500/10 dark:via-slate-900 dark:to-violet-500/5 sm:p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-600 dark:text-indigo-400">
                Overview
              </p>

              <h2
                id="language-overview-heading"
                className="mt-3 text-xl font-bold tracking-tight text-slate-950 dark:text-white"
              >
                Language overview
              </h2>

              <p className="mt-2 break-words text-sm leading-6 text-slate-600 dark:text-slate-400">
                Coverage and content for{" "}
                <bdi className="font-medium text-slate-800 dark:text-slate-200">
                  {language.name}
                </bdi>
                .
              </p>
            </div>

            <div className="p-5 sm:p-6">
              {/* Counts visible to everyone */}
              <dl className="divide-y divide-slate-100 dark:divide-slate-800">
                <div className="flex items-start justify-between gap-4 pb-5">
                  <dt>
                    <span className="block text-sm font-semibold text-slate-800 dark:text-slate-200">
                      Countries
                    </span>

                    <span className="mt-1 block text-xs leading-5 text-slate-500 dark:text-slate-400">
                      Listed geographical coverage
                    </span>
                  </dt>

                  <dd className="shrink-0 text-2xl font-bold tabular-nums text-slate-950 dark:text-white">
                    {language.countries.length}
                  </dd>
                </div>

                <div className="flex items-start justify-between gap-4 py-5">
                  <dt>
                    <span className="block text-sm font-semibold text-slate-800 dark:text-slate-200">
                      Alphabets
                    </span>

                    <span className="mt-1 block text-xs leading-5 text-slate-500 dark:text-slate-400">
                      Records / maximum allowed
                    </span>
                  </dt>

                  <dd className="shrink-0 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-bold tabular-nums text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
                    {alphabets.length} / {MAX_ALPHABETS}
                  </dd>
                </div>

                <div className="flex items-start justify-between gap-4 pt-5">
                  <dt>
                    <span className="block text-sm font-semibold text-slate-800 dark:text-slate-200">
                      {essaySearchQuery ? "Matching essays" : "Essays shown"}
                    </span>

                    <span className="mt-1 block text-xs leading-5 text-slate-500 dark:text-slate-400">
                      {essaySearchQuery
                        ? "Results for the current search"
                        : "Essays in the current collection"}
                    </span>
                  </dt>

                  <dd className="shrink-0 text-2xl font-bold tabular-nums text-slate-950 dark:text-white">
                    {essays.length}
                  </dd>
                </div>
              </dl>

              {/* Content areas visible to everyone */}
              <section
                aria-labelledby="overview-content-heading"
                className="mt-6 border-t border-slate-200 pt-5 dark:border-slate-800"
              >
                <h3
                  id="overview-content-heading"
                  className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400"
                >
                  Content areas
                </h3>

                <ul className="mt-3 flex flex-wrap gap-2">
                  {[
                    "Alphabets",
                    "Syntax & word order",
                    "Essays & translations",
                  ].map((label) => (
                    <li
                      key={label}
                      className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                    >
                      {label}
                    </li>
                  ))}
                </ul>
              </section>

              {/* Only this box is restricted to admin/root */}
              {canViewOverview && (
                <div className="mt-6 rounded-2xl border border-indigo-200 bg-indigo-50/70 p-4 dark:border-indigo-500/20 dark:bg-indigo-500/10">
                  <p className="text-sm font-semibold text-indigo-900 dark:text-indigo-200">
                    Administrative access
                  </p>

                  <p className="mt-2 text-xs leading-6 text-indigo-800 dark:text-indigo-300">
                    Your role permits editing and deleting content regardless of
                    its author or creator. Use the available controls to manage
                    table entries, alphabets, language structures, essays, and
                    reels.
                  </p>
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
