"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const MAX_WORD_ORDERS = 5;
const MAX_CONSTITUENTS_PER_WORD_ORDER = 12;

const WRITING_DIRECTIONS = [
  {
    value: "left-to-right",
    label: "Left to right",
    shortLabel: "LTR",
  },
  {
    value: "right-to-left",
    label: "Right to left",
    shortLabel: "RTL",
  },
  {
    value: "top-to-bottom",
    label: "Top to bottom",
    shortLabel: "TTB",
  },
  {
    value: "bottom-to-top",
    label: "Bottom to top",
    shortLabel: "BTT",
  },
  {
    value: "boustrophedon",
    label: "Boustrophedon",
    shortLabel: "Alternating",
  },
  {
    value: "mixed",
    label: "Mixed or context-dependent",
    shortLabel: "Mixed",
  },
] as const;

const CONSTITUENTS = [
  {
    value: "subject",
    label: "Subject",
    shortLabel: "S",
  },
  {
    value: "verb",
    label: "Verb / predicate",
    shortLabel: "V",
  },
  {
    value: "object",
    label: "Direct object",
    shortLabel: "O",
  },
  {
    value: "indirect-object",
    label: "Indirect object",
    shortLabel: "IO",
  },
  {
    value: "complement",
    label: "Complement",
    shortLabel: "C",
  },
  {
    value: "adverbial",
    label: "Adverbial",
    shortLabel: "Adv",
  },
  {
    value: "auxiliary",
    label: "Auxiliary",
    shortLabel: "Aux",
  },
  {
    value: "topic",
    label: "Topic",
    shortLabel: "Top",
  },
  {
    value: "focus",
    label: "Focus",
    shortLabel: "Foc",
  },
  {
    value: "noun-phrase",
    label: "Noun phrase",
    shortLabel: "NP",
  },
  {
    value: "adjective",
    label: "Adjective / adjectival phrase",
    shortLabel: "Adj",
  },
  {
    value: "adposition",
    label: "Adposition",
    shortLabel: "Adp",
  },
  {
    value: "particle",
    label: "Particle",
    shortLabel: "Part",
  },
  {
    value: "classifier",
    label: "Classifier",
    shortLabel: "Cl",
  },
  {
    value: "other",
    label: "Other constituent",
    shortLabel: "Other",
  },
] as const;

type WritingDirection = (typeof WRITING_DIRECTIONS)[number]["value"];

type Constituent = (typeof CONSTITUENTS)[number]["value"];

type WordOrder = {
  _id?: string;
  label: string;
  constituents: Constituent[];
  notes: string;
};

type LanguageStructure = {
  _id: string;
  writingDirections: WritingDirection[];
  wordOrders: WordOrder[];
  status?: "draft" | "published" | "archived";
};

type Language = {
  _id: string;
  name: string;
  countries?: string[];
};

interface LanguageStructureFormToggleProps {
  language: Language;
  languageStructure: LanguageStructure | null;
  disabled?: boolean;
  disabledMessage?: string;
}

function arraysMatch<T>(first: T[], second: T[]) {
  return (
    first.length === second.length &&
    first.every((value, index) => value === second[index])
  );
}

function wordOrdersMatch(first: WordOrder[], second: WordOrder[]) {
  if (first.length !== second.length) return false;

  return first.every((wordOrder, index) => {
    const other = second[index];

    if (!other) return false;

    return (
      wordOrder.label === other.label &&
      wordOrder.notes === other.notes &&
      arraysMatch(wordOrder.constituents, other.constituents)
    );
  });
}

function cloneWordOrders(wordOrders: WordOrder[]): WordOrder[] {
  return wordOrders.map((wordOrder) => ({
    _id: wordOrder._id,
    label: wordOrder.label || "",
    constituents: Array.isArray(wordOrder.constituents)
      ? [...wordOrder.constituents]
      : [],
    notes: wordOrder.notes || "",
  }));
}

function createDraftId() {
  return `draft-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export default function LanguageStructureFormToggle({
  language,
  languageStructure,
  disabled = false,
  disabledMessage = "",
}: LanguageStructureFormToggleProps) {
  const router = useRouter();

  const [open, setOpen] = useState(false);

  const [writingDirections, setWritingDirections] = useState<
    WritingDirection[]
  >([]);

  const [wordOrders, setWordOrders] = useState<WordOrder[]>([]);
  const [status, setStatus] = useState<"draft" | "published" | "archived">(
    "published",
  );

  const [selectedConstituent, setSelectedConstituent] = useState<
    Constituent | ""
  >("");

  const [draftLabel, setDraftLabel] = useState("");
  const [draftNotes, setDraftNotes] = useState("");

  const [draftConstituents, setDraftConstituents] = useState<Constituent[]>([]);

  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const isEditing = Boolean(languageStructure);

  const constituentMap = useMemo(
    () =>
      new Map(
        CONSTITUENTS.map((constituent) => [constituent.value, constituent]),
      ),
    [],
  );

  const openModal = () => {
    setWritingDirections(languageStructure?.writingDirections || []);
    setWordOrders(cloneWordOrders(languageStructure?.wordOrders || []));
    setStatus(languageStructure?.status || "published");

    setSelectedConstituent("");
    setDraftLabel("");
    setDraftNotes("");
    setDraftConstituents([]);

    setError("");
    setOpen(true);
  };

  const closeModal = () => {
    if (saving) return;

    setOpen(false);
    setError("");
  };

  const toggleWritingDirection = (value: WritingDirection) => {
    setError("");

    setWritingDirections((current) =>
      current.includes(value)
        ? current.filter((direction) => direction !== value)
        : [...current, value],
    );
  };

  const addDraftConstituent = () => {
    setError("");

    if (!selectedConstituent) {
      setError("Select a constituent before adding it.");
      return;
    }

    if (draftConstituents.length >= MAX_CONSTITUENTS_PER_WORD_ORDER) {
      setError(
        `A pattern can contain up to ${MAX_CONSTITUENTS_PER_WORD_ORDER} constituents.`,
      );
      return;
    }

    setDraftConstituents((current) => {
      if (!selectedConstituent) return current;

      return [...current, selectedConstituent];
    });

    setSelectedConstituent("");
  };

  const removeDraftConstituent = (index: number) => {
    setDraftConstituents((current) =>
      current.filter((_, currentIndex) => currentIndex !== index),
    );
  };

  const moveDraftConstituent = (index: number, direction: "left" | "right") => {
    setDraftConstituents((current) => {
      const targetIndex = direction === "left" ? index - 1 : index + 1;

      if (targetIndex < 0 || targetIndex >= current.length) {
        return current;
      }

      const next = [...current];
      const [item] = next.splice(index, 1);
      next.splice(targetIndex, 0, item);

      return next;
    });
  };

  const clearDraftPattern = () => {
    setSelectedConstituent("");
    setDraftLabel("");
    setDraftNotes("");
    setDraftConstituents([]);
    setError("");
  };

  const addWordOrder = () => {
    setError("");

    if (wordOrders.length >= MAX_WORD_ORDERS) {
      setError(
        `A language can have a maximum of ${MAX_WORD_ORDERS} constituent-order patterns.`,
      );
      return;
    }

    if (draftConstituents.length === 0) {
      setError("Add at least one constituent to create a pattern.");
      return;
    }

    setWordOrders((current) => [
      ...current,
      {
        _id: createDraftId(),
        label: draftLabel.trim().slice(0, 100),
        constituents: [...draftConstituents],
        notes: draftNotes.trim().slice(0, 500),
      },
    ]);

    clearDraftPattern();
  };

  const removeWordOrder = (id: string | undefined, index: number) => {
    setError("");

    setWordOrders((current) =>
      current.filter((wordOrder, currentIndex) => {
        if (id) return wordOrder._id !== id;

        return currentIndex !== index;
      }),
    );
  };

  const canSave = useMemo(() => {
    if (!isEditing) {
      return writingDirections.length > 0 || wordOrders.length > 0;
    }

    const originalDirections = languageStructure?.writingDirections || [];

    const originalWordOrders = cloneWordOrders(
      languageStructure?.wordOrders || [],
    );

    return (
      !arraysMatch(writingDirections, originalDirections) ||
      !wordOrdersMatch(wordOrders, originalWordOrders) ||
      status !== (languageStructure?.status || "published")
    );
  }, [isEditing, languageStructure, status, wordOrders, writingDirections]);

  const handleSubmit = async () => {
    setError("");

    if (
      !isEditing &&
      writingDirections.length === 0 &&
      wordOrders.length === 0
    ) {
      setError(
        "Add at least one writing direction or one constituent-order pattern.",
      );
      return;
    }

    if (wordOrders.length > MAX_WORD_ORDERS) {
      setError(
        `A language can have a maximum of ${MAX_WORD_ORDERS} constituent-order patterns.`,
      );
      return;
    }

    setSaving(true);

    try {
      const endpoint = isEditing
        ? `/api/structure/${languageStructure?._id}`
        : "/api/structure";

      const response = await fetch(endpoint, {
        method: isEditing ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          language: language._id,
          writingDirections,
          wordOrders: wordOrders.map((wordOrder) => ({
            label: wordOrder.label,
            constituents: wordOrder.constituents,
            notes: wordOrder.notes,
          })),
          status,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.message || "Unable to save language structure details.",
        );
      }

      setOpen(false);
      router.refresh();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to save language structure details.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        title={disabled ? disabledMessage : undefined}
        onClick={openModal}
        className="
          inline-flex min-h-11 items-center justify-center rounded-xl
          bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white
          shadow-sm transition hover:bg-cyan-700 hover:shadow-md
          disabled:cursor-not-allowed disabled:opacity-50
        "
      >
        <span className="mr-2 text-lg leading-none">
          {isEditing ? "✎" : "+"}
        </span>

        {isEditing ? "Edit structure" : "Add structure"}
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="language-structure-modal-title"
          onMouseDown={closeModal}
          className="
            fixed inset-0 z-50 flex items-center justify-center
            bg-slate-950/60 p-4 backdrop-blur-sm
          "
        >
          <div
            onMouseDown={(event) => event.stopPropagation()}
            className="
              max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl
              border border-slate-200 bg-white p-6 shadow-2xl
              dark:border-slate-700 dark:bg-slate-900 sm:p-7
            "
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-cyan-700 dark:text-cyan-300">
                  Language structure
                </p>

                <h2
                  id="language-structure-modal-title"
                  className="mt-2 text-2xl font-bold tracking-tight text-slate-950 dark:text-white"
                >
                  {isEditing
                    ? `Edit ${language.name} structure`
                    : `Add ${language.name} structure`}
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                  Record writing directions and build custom constituent-order
                  patterns.
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                aria-label="Close language structure form"
                className="
                  inline-flex h-9 w-9 shrink-0 items-center justify-center
                  rounded-lg bg-slate-100 text-lg text-slate-600 transition
                  hover:bg-slate-200 disabled:cursor-not-allowed
                  disabled:opacity-50 dark:bg-slate-800 dark:text-slate-300
                  dark:hover:bg-slate-700
                "
              >
                ×
              </button>
            </div>

            <div className="mt-7 space-y-8">
              <section>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Writing directions
                  </h3>

                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Select every direction used by this language. There is no
                    limit.
                  </p>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {WRITING_DIRECTIONS.map((direction) => {
                    const selected = writingDirections.includes(
                      direction.value,
                    );

                    return (
                      <label
                        key={direction.value}
                        className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition ${
                          selected
                            ? "border-fuchsia-400 bg-fuchsia-50 dark:border-fuchsia-400/60 dark:bg-fuchsia-500/10"
                            : "border-slate-200 bg-slate-50 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() =>
                            toggleWritingDirection(direction.value)
                          }
                          className="h-4 w-4 rounded border-slate-300 text-fuchsia-600 focus:ring-fuchsia-500"
                        />

                        <span className="min-w-0">
                          <span className="block text-sm font-semibold text-slate-800 dark:text-slate-100">
                            {direction.label}
                          </span>

                          <span className="block text-xs text-slate-500 dark:text-slate-400">
                            {direction.shortLabel}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </section>

              <section className="border-t border-slate-200 pt-7 dark:border-slate-800">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Constituent-order patterns
                    </h3>

                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      Build a pattern by selecting constituents and arranging
                      them in the correct sequence.
                    </p>
                  </div>

                  <span className="rounded-full bg-cyan-50 px-3 py-1.5 text-xs font-bold text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-300">
                    {wordOrders.length} / {MAX_WORD_ORDERS}
                  </span>
                </div>

                {wordOrders.length > 0 && (
                  <div className="mt-5 space-y-3">
                    {wordOrders.map((wordOrder, wordOrderIndex) => (
                      <article
                        key={wordOrder._id || wordOrderIndex}
                        className="rounded-2xl border border-cyan-200 bg-cyan-50/50 p-4 dark:border-cyan-500/20 dark:bg-cyan-500/5"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <p className="text-xs font-bold uppercase tracking-[0.14em] text-cyan-700 dark:text-cyan-300">
                              Pattern {wordOrderIndex + 1}
                            </p>

                            <h4 className="mt-2 break-words text-base font-bold text-slate-900 dark:text-white">
                              {wordOrder.label ||
                                `Constituent order ${wordOrderIndex + 1}`}
                            </h4>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              removeWordOrder(wordOrder._id, wordOrderIndex)
                            }
                            className="
                              inline-flex min-h-9 shrink-0 items-center
                              justify-center rounded-lg border border-red-200
                              bg-red-50 px-3 py-1.5 text-xs font-bold
                              text-red-700 transition hover:bg-red-100
                              dark:border-red-500/20 dark:bg-red-500/10
                              dark:text-red-300 dark:hover:bg-red-500/20
                            "
                          >
                            Remove
                          </button>
                        </div>

                        <div className="mt-4 flex flex-wrap items-center gap-2">
                          {wordOrder.constituents.map(
                            (constituent, constituentIndex) => {
                              const item = constituentMap.get(constituent);

                              return (
                                <div
                                  key={`${wordOrder._id || wordOrderIndex}-${constituentIndex}`}
                                  className="flex items-center gap-2"
                                >
                                  {constituentIndex > 0 && (
                                    <span
                                      aria-hidden="true"
                                      className="text-cyan-500 dark:text-cyan-400"
                                    >
                                      →
                                    </span>
                                  )}

                                  <span className="rounded-lg border border-cyan-200 bg-white px-2.5 py-1.5 text-xs font-bold text-cyan-800 dark:border-cyan-500/20 dark:bg-slate-900 dark:text-cyan-200">
                                    {item?.shortLabel || constituent}
                                  </span>
                                </div>
                              );
                            },
                          )}
                        </div>

                        {wordOrder.notes && (
                          <p className="mt-4 border-t border-cyan-200 pt-3 text-sm leading-6 text-slate-600 dark:border-cyan-500/20 dark:text-slate-300">
                            {wordOrder.notes}
                          </p>
                        )}
                      </article>
                    ))}
                  </div>
                )}

                {wordOrders.length < MAX_WORD_ORDERS && (
                  <div className="mt-5 rounded-2xl border border-dashed border-cyan-300 bg-cyan-50/50 p-4 dark:border-cyan-500/30 dark:bg-cyan-500/5">
                    <h4 className="text-sm font-bold text-cyan-900 dark:text-cyan-100">
                      Add a new pattern
                    </h4>

                    <p className="mt-1 text-xs leading-5 text-cyan-800 dark:text-cyan-200">
                      Example: Subject → Verb / predicate → Direct object.
                    </p>

                    <div className="mt-4 space-y-4">
                      <input
                        type="text"
                        value={draftLabel}
                        maxLength={100}
                        onChange={(event) => setDraftLabel(event.target.value)}
                        placeholder="Optional label, e.g. Neutral declarative clause"
                        className="
                          min-h-11 w-full rounded-xl border border-cyan-200
                          bg-white px-4 py-2.5 text-sm text-slate-900
                          outline-none transition placeholder:text-slate-400
                          focus:border-cyan-500 focus:ring-4
                          focus:ring-cyan-500/10 dark:border-cyan-500/20
                          dark:bg-slate-900 dark:text-white
                          dark:placeholder:text-slate-500
                        "
                      />

                      <div className="flex flex-col gap-3 sm:flex-row">
                        <select
                          value={selectedConstituent}
                          onChange={(event) =>
                            setSelectedConstituent(
                              event.target.value as Constituent | "",
                            )
                          }
                          className="
                            min-h-11 min-w-0 flex-1 rounded-xl border
                            border-cyan-200 bg-white px-4 py-2.5 text-sm
                            text-slate-900 outline-none transition
                            focus:border-cyan-500 focus:ring-4
                            focus:ring-cyan-500/10 dark:border-cyan-500/20
                            dark:bg-slate-900 dark:text-white
                          "
                        >
                          <option value="">
                            Select a sentence constituent
                          </option>

                          {CONSTITUENTS.map((constituent) => (
                            <option
                              key={constituent.value}
                              value={constituent.value}
                            >
                              {constituent.shortLabel} — {constituent.label}
                            </option>
                          ))}
                        </select>

                        <button
                          type="button"
                          onClick={addDraftConstituent}
                          disabled={
                            !selectedConstituent ||
                            draftConstituents.length >=
                              MAX_CONSTITUENTS_PER_WORD_ORDER
                          }
                          className="
                            inline-flex min-h-11 shrink-0 items-center
                            justify-center rounded-xl bg-cyan-600 px-4
                            py-2.5 text-sm font-bold text-white transition
                            hover:bg-cyan-700 disabled:cursor-not-allowed
                            disabled:opacity-50
                          "
                        >
                          Add constituent
                        </button>
                      </div>

                      {draftConstituents.length > 0 ? (
                        <div>
                          <div className="mb-2 flex items-center justify-between gap-3">
                            <p className="text-xs font-bold uppercase tracking-[0.14em] text-cyan-800 dark:text-cyan-200">
                              Pattern sequence
                            </p>

                            <span className="text-xs font-medium text-cyan-700 dark:text-cyan-300">
                              {draftConstituents.length} /{" "}
                              {MAX_CONSTITUENTS_PER_WORD_ORDER}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            {draftConstituents.map(
                              (constituent, constituentIndex) => {
                                const item = constituentMap.get(constituent);

                                return (
                                  <div
                                    key={`${constituent}-${constituentIndex}`}
                                    className="
                                      flex items-center gap-1 rounded-xl border
                                      border-cyan-200 bg-white px-2 py-1.5
                                      text-xs font-bold text-cyan-800
                                      dark:border-cyan-500/20
                                      dark:bg-slate-900 dark:text-cyan-200
                                    "
                                  >
                                    {constituentIndex > 0 && (
                                      <span
                                        aria-hidden="true"
                                        className="mr-1 text-cyan-500"
                                      >
                                        →
                                      </span>
                                    )}

                                    <span>
                                      {item?.shortLabel || constituent}
                                    </span>

                                    <button
                                      type="button"
                                      disabled={constituentIndex === 0}
                                      onClick={() =>
                                        moveDraftConstituent(
                                          constituentIndex,
                                          "left",
                                        )
                                      }
                                      aria-label={`Move ${
                                        item?.label || constituent
                                      } left`}
                                      className="
                                        rounded px-1 text-cyan-700 transition
                                        hover:bg-cyan-100 disabled:cursor-not-allowed
                                        disabled:opacity-30 dark:text-cyan-300
                                        dark:hover:bg-cyan-500/20
                                      "
                                    >
                                      ←
                                    </button>

                                    <button
                                      type="button"
                                      disabled={
                                        constituentIndex ===
                                        draftConstituents.length - 1
                                      }
                                      onClick={() =>
                                        moveDraftConstituent(
                                          constituentIndex,
                                          "right",
                                        )
                                      }
                                      aria-label={`Move ${
                                        item?.label || constituent
                                      } right`}
                                      className="
                                        rounded px-1 text-cyan-700 transition
                                        hover:bg-cyan-100 disabled:cursor-not-allowed
                                        disabled:opacity-30 dark:text-cyan-300
                                        dark:hover:bg-cyan-500/20
                                      "
                                    >
                                      →
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() =>
                                        removeDraftConstituent(constituentIndex)
                                      }
                                      aria-label={`Remove ${
                                        item?.label || constituent
                                      }`}
                                      className="
                                        rounded px-1 text-red-600 transition
                                        hover:bg-red-50 dark:text-red-400
                                        dark:hover:bg-red-500/10
                                      "
                                    >
                                      ×
                                    </button>
                                  </div>
                                );
                              },
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-xl border border-dashed border-cyan-200 bg-white/70 px-3 py-4 text-center text-xs text-cyan-800 dark:border-cyan-500/20 dark:bg-slate-900/60 dark:text-cyan-200">
                          Add constituents to define this order.
                        </div>
                      )}

                      <textarea
                        value={draftNotes}
                        maxLength={500}
                        onChange={(event) => setDraftNotes(event.target.value)}
                        placeholder="Optional notes, e.g. Common in neutral main clauses."
                        className="
                          min-h-24 w-full rounded-xl border border-cyan-200
                          bg-white px-4 py-3 text-sm text-slate-900
                          outline-none transition placeholder:text-slate-400
                          focus:border-cyan-500 focus:ring-4
                          focus:ring-cyan-500/10 dark:border-cyan-500/20
                          dark:bg-slate-900 dark:text-white
                          dark:placeholder:text-slate-500
                        "
                      />

                      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                        <button
                          type="button"
                          onClick={clearDraftPattern}
                          disabled={
                            !draftLabel &&
                            !draftNotes &&
                            draftConstituents.length === 0
                          }
                          className="
                            inline-flex min-h-10 items-center justify-center
                            rounded-xl border border-slate-300 bg-white px-4
                            py-2 text-sm font-semibold text-slate-700
                            transition hover:bg-slate-50
                            disabled:cursor-not-allowed disabled:opacity-50
                            dark:border-slate-700 dark:bg-slate-800
                            dark:text-slate-200 dark:hover:bg-slate-700
                          "
                        >
                          Clear draft
                        </button>

                        <button
                          type="button"
                          onClick={addWordOrder}
                          disabled={draftConstituents.length === 0}
                          className="
                            inline-flex min-h-10 items-center justify-center
                            rounded-xl bg-cyan-600 px-4 py-2 text-sm
                            font-semibold text-white transition
                            hover:bg-cyan-700 disabled:cursor-not-allowed
                            disabled:opacity-50
                          "
                        >
                          Add pattern
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </section>

              <section className="border-t border-slate-200 pt-7 dark:border-slate-800">
                <label className="mb-2 block text-sm font-bold text-slate-800 dark:text-slate-100">
                  Status
                </label>

                <select
                  value={status}
                  onChange={(event) =>
                    setStatus(
                      event.target.value as "draft" | "published" | "archived",
                    )
                  }
                  className="
                    min-h-11 w-full rounded-xl border border-slate-300
                    bg-white px-4 py-2.5 text-sm text-slate-900 outline-none
                    transition focus:border-cyan-500 focus:ring-4
                    focus:ring-cyan-500/10 dark:border-slate-700
                    dark:bg-slate-800 dark:text-white
                  "
                >
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                  <option value="archived">Archived</option>
                </select>
              </section>

              {error && (
                <div
                  role="alert"
                  className="
                    rounded-xl border border-red-200 bg-red-50 px-4 py-3
                    text-sm text-red-700 dark:border-red-500/20
                    dark:bg-red-500/10 dark:text-red-300
                  "
                >
                  {error}
                </div>
              )}

              <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-6 dark:border-slate-800 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="
                    inline-flex min-h-11 items-center justify-center
                    rounded-xl border border-slate-300 bg-white px-5 py-2.5
                    text-sm font-semibold text-slate-700 transition
                    hover:bg-slate-50 disabled:cursor-not-allowed
                    disabled:opacity-50 dark:border-slate-700
                    dark:bg-slate-800 dark:text-slate-200
                    dark:hover:bg-slate-700
                  "
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={saving || !canSave}
                  className="
                    inline-flex min-h-11 items-center justify-center
                    rounded-xl bg-cyan-600 px-5 py-2.5 text-sm font-semibold
                    text-white transition hover:bg-cyan-700
                    disabled:cursor-not-allowed disabled:opacity-50
                  "
                >
                  {saving
                    ? "Saving..."
                    : isEditing
                      ? "Save structure"
                      : "Create structure"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
