"use client";

import { useId, useState } from "react";

interface AlphabetFormProps {
  language: {
    _id: string;
    name: string;
  };
  existingAlphabet?: {
    _id: string;
    name?: string;
    letters: { character: string }[];
  } | null;
  closeForm: () => void;
}

export default function AlphabetForm({
  language,
  existingAlphabet,
  closeForm,
}: AlphabetFormProps) {
  const nameInputId = useId();
  const lettersInputId = useId();

  const [name, setName] = useState(existingAlphabet?.name || "");

  const [letters, setLetters] = useState(
    existingAlphabet
      ? existingAlphabet.letters
          .map((letter: { character: string }) => letter.character)
          .join(", ")
      : "",
  );

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isEditing = Boolean(existingAlphabet);

  const parsedLetters = letters
    .split(",")
    .map((character) => character.trim())
    .filter((character) => character.length > 0);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (parsedLetters.length === 0) {
      setError("Add at least one letter before saving.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        existingAlphabet
          ? `/api/alphabet/${existingAlphabet._id}`
          : "/api/alphabet",
        {
          method: existingAlphabet ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name,
            language: language._id,
            letters: parsedLetters.map((character, index) => ({
              character,
              order: index + 1,
              ipa: "",
              audioUrl: "",
            })),
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Something went wrong. Please try again.");
        return;
      }

      closeForm();
      window.location.reload();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-sm dark:border-emerald-500/20 dark:bg-slate-900"
    >
      <div className="border-b border-emerald-100 bg-emerald-50/70 px-5 py-4 dark:border-emerald-500/15 dark:bg-emerald-500/5 sm:px-6">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-lg font-bold text-white shadow-sm">
            A
          </div>

          <div>
            <h3 className="text-lg font-bold text-slate-950 dark:text-white">
              {isEditing ? "Edit alphabet" : "Add alphabet"}
            </h3>

            <p className="mt-1 text-sm leading-5 text-slate-600 dark:text-slate-400">
              {isEditing
                ? `Update the writing system for ${language.name}.`
                : `Add a writing system for ${language.name}.`}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-6 p-5 sm:p-6">
        {error && (
          <div
            role="alert"
            className="flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-200"
          >
            <span
              aria-hidden="true"
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-600 text-xs font-bold text-white"
            >
              !
            </span>

            <p className="leading-5">{error}</p>
          </div>
        )}

        <div>
          <label
            htmlFor={nameInputId}
            className="block text-sm font-bold text-slate-800 dark:text-slate-100"
          >
            Alphabet name{" "}
            <span className="font-normal text-slate-400">(optional)</span>
          </label>

          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Use a name that helps users distinguish this alphabet from other
            writing systems.
          </p>

          <input
            id={nameInputId}
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Latin Script, Ajami Script, Cyrillic Script..."
            maxLength={100}
            disabled={loading}
            className="mt-3 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-emerald-400 dark:disabled:bg-slate-800/60"
          />
        </div>

        <div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label
              htmlFor={lettersInputId}
              className="block text-sm font-bold text-slate-800 dark:text-slate-100"
            >
              Letters
            </label>

            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {parsedLetters.length}{" "}
              {parsedLetters.length === 1 ? "letter" : "letters"}
            </span>
          </div>

          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Separate each letter or character with a comma.
          </p>

          <textarea
            id={lettersInputId}
            value={letters}
            onChange={(event) => setLetters(event.target.value)}
            placeholder="a, b, c, d, e..."
            required
            disabled={loading}
            rows={5}
            className="mt-3 min-h-32 w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 font-medium text-slate-900 outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-emerald-400 dark:disabled:bg-slate-800/60"
          />

          <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/60">
            <p className="text-xs font-bold uppercase tracking-[0.13em] text-slate-500 dark:text-slate-400">
              Example
            </p>

            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              <span className="font-semibold">a, b, c, ch, d</span> creates five
              alphabet entries, including the multi-character letter “ch”.
            </p>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-end dark:border-slate-800">
          <button
            type="button"
            onClick={closeForm}
            disabled={loading}
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 dark:focus:ring-offset-slate-900"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={loading}
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 dark:focus:ring-offset-slate-900"
          >
            {loading ? (
              <>
                <span
                  aria-hidden="true"
                  className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
                />
                Saving...
              </>
            ) : isEditing ? (
              "Save alphabet changes"
            ) : (
              "Add alphabet"
            )}
          </button>
        </div>
      </div>
    </form>
  );
}
