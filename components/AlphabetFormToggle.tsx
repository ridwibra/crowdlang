"use client";

import { useState } from "react";
import AlphabetForm from "./AlphabetForm";

interface AlphabetFormToggleProps {
  language: {
    _id: string;
    name: string;
  };

  alphabet?: {
    _id: string;
    name?: string;
    letters: {
      character: string;
      order?: number;
      ipa?: string;
      audioUrl?: string;
    }[];
  } | null;

  disabled?: boolean;
  disabledMessage?: string;
}

export default function AlphabetFormToggle({
  language,
  alphabet,
  disabled = false,
  disabledMessage = "You cannot add another alphabet.",
}: AlphabetFormToggleProps) {
  const [open, setOpen] = useState(false);

  const isEditing = Boolean(alphabet);

  return (
    <div className="w-full sm:w-auto">
      <button
        type="button"
        disabled={disabled}
        title={disabled ? disabledMessage : undefined}
        onClick={() => setOpen((current) => !current)}
        className="inline-flex min-h-10 w-full items-center justify-center rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none disabled:hover:bg-slate-300 dark:disabled:bg-slate-700 dark:disabled:text-slate-400 dark:focus:ring-offset-slate-900 sm:w-auto"
      >
        <span className="mr-2 text-base leading-none">
          {isEditing ? "✎" : "+"}
        </span>

        {open ? "Close form" : isEditing ? "Edit alphabet" : "Add alphabet"}
      </button>

      {disabled && (
        <p className="mt-2 max-w-56 text-xs leading-5 text-amber-700 dark:text-amber-300">
          {disabledMessage}
        </p>
      )}

      {open && !disabled && (
        <div className="mt-5 rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4 dark:border-emerald-500/20 dark:bg-emerald-500/5">
          <AlphabetForm
            language={language}
            existingAlphabet={alphabet}
            closeForm={() => setOpen(false)}
          />
        </div>
      )}
    </div>
  );
}
