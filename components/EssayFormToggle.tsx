"use client";

import { useState } from "react";
import EssayForm from "./EssayForm";

export default function EssayFormToggle({
  language,
  essay,
}: {
  language: { _id: string; name: string };
  essay?: any;
}) {
  const [open, setOpen] = useState(false);

  const isEditing = Boolean(essay);

  return (
    <div className="w-full sm:w-auto">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={`inline-flex min-h-10 w-full items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-900 sm:w-auto ${
          isEditing
            ? "bg-amber-600 hover:bg-amber-700 focus:ring-amber-500"
            : "bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500"
        }`}
      >
        <span className="mr-2 text-base leading-none">
          {isEditing ? "✎" : "+"}
        </span>
        {open ? "Close form" : isEditing ? "Edit essay" : "Add essay"}
      </button>

      {open && (
        <div className="mt-5 rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4 dark:border-indigo-500/20 dark:bg-indigo-500/5">
          <EssayForm
            language={language}
            existingEssay={essay}
            closeForm={() => setOpen(false)}
          />
        </div>
      )}
    </div>
  );
}
