"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type AssignedLanguage = {
  _id: string;
  name: string;
  countries: string[];
  role: "editor" | "expert";
};

export default function WorkspacePage() {
  const [languages, setLanguages] = useState<AssignedLanguage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadLanguages() {
      try {
        const response = await fetch("/api/workspace/languages", {
          cache: "no-store",
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(data.error || "Failed to load your languages.");
        }

        setLanguages(data.languages || []);
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Failed to load your languages.",
        );
      } finally {
        setLoading(false);
      }
    }

    loadLanguages();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center rounded-3xl border border-white/50 bg-white/80 p-6 shadow-xl backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/80">
        <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
          Loading your assigned languages...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-white/50 bg-white/80 p-7 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/80 sm:p-10">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-600 dark:text-teal-400">
          Contributor area
        </p>

        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
          My Language Workspace
        </h1>

        <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
          Select a language to manage translations and contribute language
          content.
        </p>
      </section>

      {languages.length === 0 ? (
        <section className="rounded-3xl border border-white/50 bg-white/80 p-8 text-center shadow-xl backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/80">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            No language assignments yet
          </h2>

          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            Request an editor or expert role for a language to begin
            contributing.
          </p>

          <Link
            href="/profile"
            className="mt-5 inline-flex rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-teal-700"
          >
            Go to Profile
          </Link>
        </section>
      ) : (
        <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {languages.map((language) => (
            <Link
              key={language._id}
              href={`/workspace/${language._id}`}
              className="group rounded-3xl border border-white/50 bg-white/80 p-6 shadow-xl transition hover:-translate-y-1 hover:shadow-2xl dark:border-white/10 dark:bg-slate-900/80"
            >
              <div className="flex items-start justify-between gap-3">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold capitalize ${
                    language.role === "expert"
                      ? "bg-violet-100 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300"
                      : "bg-teal-100 text-teal-700 dark:bg-teal-500/10 dark:text-teal-300"
                  }`}
                >
                  {language.role}
                </span>

                <span className="text-slate-400 transition group-hover:translate-x-1">
                  →
                </span>
              </div>

              <h2 className="mt-6 text-xl font-bold text-slate-900 dark:text-white">
                {language.name}
              </h2>

              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                {language.countries.length
                  ? language.countries.join(", ")
                  : "No country information"}
              </p>

              <p className="mt-6 text-sm font-bold text-teal-700 dark:text-teal-300">
                Open workspace →
              </p>
            </Link>
          ))}
        </section>
      )}
    </div>
  );
}
