"use client";

import { useState } from "react";

type Language = {
  _id: string;
  name: string;
};

export default function ToggleFields({ languages }: { languages: Language[] }) {
  const [type, setType] = useState("word");
  const [languageName, setLanguageName] = useState("");

  const isParagraph = type === "paragraph";

  function handleLanguageChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const selectedLanguage = languages.find(
      (language) => language._id === event.target.value,
    );

    setLanguageName(selectedLanguage?.name ?? "");
  }

  return (
    <>
      {/* LANGUAGE */}
      <div className="mb-6">
        <label
          htmlFor="languageId"
          className="mb-1 block font-medium text-slate-900 dark:text-white"
        >
          Language
        </label>

        <select
          id="languageId"
          name="languageId"
          defaultValue=""
          onChange={handleLanguageChange}
          required
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-neutral-900 dark:text-white"
        >
          <option value="" disabled>
            Select a language
          </option>

          {languages.map((language) => (
            <option key={language._id} value={language._id}>
              {language.name}
            </option>
          ))}
        </select>
      </div>

      {/* ENTRY FIELDS */}
      <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/30 sm:p-5">
        {/* TEXT TYPE */}
        <div>
          <label className="mb-1 block font-medium text-slate-900 dark:text-white">
            Text Type
          </label>

          <select
            name="textType"
            value={type}
            onChange={(event) => setType(event.target.value)}
            className="w-full rounded-md border px-3 py-2 dark:bg-neutral-900"
            required
          >
            <option value="word">Word</option>
            <option value="sentence">Sentence</option>
            <option value="expression">Expression</option>
            <option value="paragraph">Paragraph</option>
          </select>
        </div>

        {/* TEXT INPUT */}
        <div className="mt-5">
          <label className="mb-1 block font-medium text-slate-900 dark:text-white">
            Text {languageName ? `(${languageName})` : ""}
          </label>

          {!isParagraph ? (
            <input
              name="translation"
              type="text"
              className="w-full rounded-md border px-3 py-2 dark:bg-neutral-900"
              placeholder={
                languageName
                  ? `Enter ${languageName} text`
                  : "Select a language above"
              }
              required
            />
          ) : (
            <textarea
              name="translation"
              rows={6}
              className="w-full rounded-md border px-3 py-2 dark:bg-neutral-900"
              placeholder={
                languageName
                  ? `Enter ${languageName} paragraph`
                  : "Select a language above"
              }
              required
            />
          )}
        </div>

        {/* ENGLISH INPUT */}
        <div className="mt-5">
          <label className="mb-1 block font-medium text-slate-900 dark:text-white">
            Translation (English)
          </label>

          {!isParagraph ? (
            <input
              name="text"
              type="text"
              className="w-full rounded-md border px-3 py-2 dark:bg-neutral-900"
              placeholder="Enter English text"
              required
            />
          ) : (
            <textarea
              name="text"
              rows={6}
              className="w-full rounded-md border px-3 py-2 dark:bg-neutral-900"
              placeholder="Enter English paragraph"
              required
            />
          )}
        </div>
      </div>
    </>
  );
}
