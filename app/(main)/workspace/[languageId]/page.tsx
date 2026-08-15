"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

export default function LanguageWorkspacePage() {
  const params = useParams<{ languageId: string }>();

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-white/50 bg-white/80 p-7 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/80 sm:p-10">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-600 dark:text-teal-400">
          Language workspace
        </p>

        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Manage Language
        </h1>

        <p className="mt-4 break-all text-sm text-slate-600 dark:text-slate-300">
          Language ID: {params.languageId}
        </p>
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
