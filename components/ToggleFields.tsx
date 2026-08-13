"use client";

import { useState } from "react";

export default function ToggleFields({
  languageName,
}: {
  languageName: string;
}) {
  const [type, setType] = useState("word");
  const isPassage = type === "passage";

  return (
    <>
      {/* TEXT TYPE */}
      <div>
        <label className="block font-medium mb-1">Text Type</label>
        <select
          name="textType"
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="w-full px-3 py-2 border rounded-md dark:bg-neutral-900"
          required
        >
          <option value="word">Word</option>
          <option value="sentence">Sentence</option>
          <option value="expression">Expression</option>
          <option value="passage">Passage</option>
        </select>
      </div>

      {/* TRANSLATION INPUT */}
      <div>
        <label className="block font-medium mb-1">Text ({languageName})</label>

        {!isPassage ? (
          <input
            name="translation"
            type="text"
            className="w-full px-3 py-2 border rounded-md dark:bg-neutral-900"
            placeholder={`Enter ${languageName} translation`}
            required
          />
        ) : (
          <textarea
            name="translation"
            rows={6}
            className="w-full px-3 py-2 border rounded-md dark:bg-neutral-900"
            placeholder={`Enter ${languageName} passage`}
            required
          />
        )}
      </div>

      {/* ENGLISH INPUT */}
      <div>
        <label className="block font-medium mb-1">Translation (English)</label>

        {!isPassage ? (
          <input
            name="text"
            type="text"
            className="w-full px-3 py-2 border rounded-md dark:bg-neutral-900"
            placeholder="Enter English text"
            required
          />
        ) : (
          <textarea
            name="text"
            rows={6}
            className="w-full px-3 py-2 border rounded-md dark:bg-neutral-900"
            placeholder="Enter English passage"
            required
          />
        )}
      </div>
    </>
  );
}
