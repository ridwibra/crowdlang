"use client";

import { useState } from "react";
import EssayForm from "./EssayForm";

type Essay = {
  _id: string;
  title?: string;
  translationTitle?: string;
  category?: string;
  level?: string;
  tags?: string[];
  body?: string;
  translationBody?: string;
  images?: {
    image_url?: string;
    public_id?: string | null;
  }[];
};

type EssayFormToggleProps = {
  language: {
    _id: string;
    name: string;
  };
  essay?: Essay | null;
};

export default function EssayFormToggle({
  language,
  essay,
}: EssayFormToggleProps) {
  const [open, setOpen] = useState(false);

  const isEditing = Boolean(essay);

  return (
    <div className="w-full sm:w-auto">
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={`inline-flex min-h-10 w-full items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-900 sm:w-auto ${
            isEditing
              ? "bg-amber-600 hover:bg-amber-700 focus:ring-amber-500"
              : "bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500"
          }`}
        >
          <span className="mr-2 text-base leading-none">
            {isEditing ? "✎" : "+"}
          </span>

          {isEditing ? "Edit essay" : "Add essay"}
        </button>
      )}

      {open && (
        <div className="mt-5 rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4 dark:border-indigo-500/20 dark:bg-indigo-500/5">
          <EssayForm
            key={essay?._id ?? `new-${language._id}`}
            language={language}
            existingEssay={essay}
            closeForm={() => setOpen(false)}
          />
        </div>
      )}
    </div>
  );
}
