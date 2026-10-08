"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const MAX_PARTS = 12;

const DIRECTIONS = [
  ["left-to-right", "Left to right", "Text runs from left to right."],
  ["right-to-left", "Right to left", "Text runs from right to left."],
  ["top-to-bottom", "Top to bottom", "Text runs downwards."],
  ["bottom-to-top", "Bottom to top", "Text runs upwards."],
  [
    "boustrophedon",
    "Alternating lines",
    "Successive lines alternate direction.",
  ],
  ["mixed", "Mixed directions", "Direction depends on the writing context."],
] as const;

const PARTS = [
  ["subject", "Subject", "The person or thing the clause is about."],
  ["verb", "Verb / predicate", "The action, state, or predicate."],
  ["object", "Direct object", "A direct object of the verb."],
  ["indirect-object", "Indirect object", "Often a recipient or beneficiary."],
  ["complement", "Complement", "A phrase completing the meaning."],
  ["adverbial", "Adverbial", "Information such as time, place, or manner."],
  ["auxiliary", "Auxiliary", "A helping verb."],
  ["topic", "Topic", "What the statement is framed around."],
  ["focus", "Focus", "The information being highlighted."],
  ["noun-phrase", "Noun phrase", "A noun and words associated with it."],
  ["adjective", "Adjective / adjectival phrase", "A description of a noun."],
  ["adposition", "Adposition", "A preposition or postposition."],
  ["particle", "Particle", "A grammatical particle."],
  ["classifier", "Classifier", "A classifier used with a noun."],
  ["other", "Other sentence part", "Another grammatical element."],
] as const;

type Direction = (typeof DIRECTIONS)[number][0];
type Part = (typeof PARTS)[number][0];

type WordOrder = {
  _id?: string;
  label: string;
  constituents: string[];
  notes: string;
};

type Structure = {
  _id: string;
  writingDirections: string[];
  wordOrders: WordOrder[];
  status?: string;
};

type Props = {
  language: { _id: string; name: string };
  languageStructure: Structure | null;
  disabled?: boolean;
  disabledMessage?: string;
};

export default function LanguageStructureFormToggle({
  language,
  languageStructure,
  disabled = false,
  disabledMessage = "You cannot add another structure.",
}: Props) {
  const router = useRouter();
  const formId = useId();

  const [open, setOpen] = useState(false);
  const [directions, setDirections] = useState<string[]>([]);
  const [parts, setParts] = useState<string[]>([]);
  const [selectedPart, setSelectedPart] = useState<Part | "">("");
  const [label, setLabel] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<"draft" | "publish">("publish");
  const [saving, setSaving] = useState(false);

  const isEditing = Boolean(languageStructure);
  const hasLegacyPatterns = (languageStructure?.wordOrders.length ?? 0) > 1;

  const partName = (value: string) =>
    PARTS.find(([key]) => key === value)?.[1] || value;

  function openForm() {
    if (disabled) return;

    if (hasLegacyPatterns) {
      toast.error(
        "This record contains multiple patterns. Split them into separate records before editing with the single-pattern form.",
      );
      return;
    }

    const pattern = languageStructure?.wordOrders[0];

    setDirections([...(languageStructure?.writingDirections ?? [])]);
    setParts([...(pattern?.constituents ?? [])]);
    setLabel(pattern?.label ?? "");
    setNotes(pattern?.notes ?? "");
    setSelectedPart("");
    setStatus(languageStructure?.status === "draft" ? "draft" : "publish");
    setOpen(true);
  }

  function toggleDirection(value: Direction) {
    setDirections((previous) =>
      previous.includes(value)
        ? previous.filter((direction) => direction !== value)
        : [...previous, value],
    );
  }

  function addPart() {
    if (!selectedPart) {
      toast.error("Choose a sentence part first.");
      return;
    }

    if (parts.length >= MAX_PARTS) {
      toast.error(`A pattern can contain up to ${MAX_PARTS} sentence parts.`);
      return;
    }

    setParts((previous) => [...previous, selectedPart]);
    setSelectedPart("");
  }

  function movePart(index: number, change: -1 | 1) {
    const target = index + change;
    if (target < 0 || target >= parts.length) return;

    setParts((previous) => {
      const next = [...previous];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  async function saveStructure(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;

    if (!directions.length && !parts.length) {
      toast.error(
        "Choose a writing direction or add a sentence-order pattern.",
      );
      return;
    }

    if (selectedPart) {
      toast.error(
        "Click Add sentence part to include your selection, or clear the selection before saving.",
      );
      return;
    }

    if (!parts.length && (label.trim() || notes.trim())) {
      toast.error("Add sentence parts or clear the pattern title and notes.");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(
        languageStructure
          ? `/api/structure/${languageStructure._id}`
          : "/api/structure",
        {
          method: isEditing ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            language: language._id,
            writingDirections: directions,
            wordOrders: parts.length
              ? [
                  {
                    label: label.trim(),
                    constituents: parts,
                    notes: notes.trim(),
                  },
                ]
              : [],
            status,
          }),
        },
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        toast.error(data.message || "Unable to save this structure.");
        return;
      }

      toast.success(
        status === "draft"
          ? "Structure saved as a draft."
          : "Structure publish.",
      );
      setOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to save this structure.",
      );
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    "min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white";

  const buttonClass =
    "inline-flex min-h-11 items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:focus:ring-offset-slate-900";

  return (
    <div className="min-w-0 w-full">
      {!open && (
        <>
          <button
            type="button"
            disabled={disabled}
            onClick={openForm}
            className={`${buttonClass} bg-cyan-600 text-white hover:bg-cyan-700`}
          >
            {isEditing ? "Edit structure" : "Create structure"}
          </button>

          {disabled && (
            <p className="mt-2 text-xs leading-5 text-amber-700 dark:text-amber-300">
              {disabledMessage}
            </p>
          )}
        </>
      )}

      {open && (
        <form
          onSubmit={saveStructure}
          className="mt-3 overflow-hidden rounded-2xl border border-cyan-200 bg-white dark:border-cyan-500/20 dark:bg-slate-900"
        >
          <div className="border-b border-slate-200 bg-cyan-50/60 p-5 dark:border-slate-800 dark:bg-cyan-500/5">
            <h3 className="text-lg font-bold text-slate-950 dark:text-white">
              {isEditing
                ? "Edit language structure"
                : "Create language structure"}
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
              Record writing directions and one optional sentence-order pattern
              for <bdi>{language.name}</bdi>.
            </p>
          </div>

          <fieldset disabled={saving} className="min-w-0 space-y-7 p-5">
            <fieldset>
              <legend className="text-base font-semibold text-slate-900 dark:text-white">
                1. Choose writing directions
              </legend>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Select every direction that applies to this record.
              </p>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {DIRECTIONS.map(([value, name, description]) => (
                  <label
                    key={value}
                    className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-700"
                  >
                    <input
                      type="checkbox"
                      checked={directions.includes(value)}
                      onChange={() => toggleDirection(value)}
                      className="mt-1 h-4 w-4 accent-cyan-600"
                    />
                    <span>
                      <span className="block text-sm font-semibold text-slate-800 dark:text-slate-200">
                        {name}
                      </span>
                      <span className="mt-1 block text-xs leading-5 text-slate-500 dark:text-slate-400">
                        {description}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            <section className="border-t border-slate-200 pt-6 dark:border-slate-800">
              <h4 className="text-base font-semibold text-slate-900 dark:text-white">
                2. Build one sentence-order pattern
              </h4>
              <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
                Add sentence parts in their grammatical order. This is separate
                from the direction in which text is written.
              </p>

              <label className="mt-4 block">
                <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Pattern title (optional)
                </span>
                <input
                  value={label}
                  onChange={(event) => setLabel(event.target.value)}
                  maxLength={100}
                  dir="auto"
                  placeholder="For example: Neutral declarative clause"
                  className={inputClass}
                />
              </label>

              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="min-w-0 flex-1">
                  <label
                    htmlFor={`${formId}-part`}
                    className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300"
                  >
                    Sentence part
                  </label>
                  <select
                    id={`${formId}-part`}
                    value={selectedPart}
                    onChange={(event) =>
                      setSelectedPart(event.target.value as Part | "")
                    }
                    className={inputClass}
                  >
                    <option value="">Choose a sentence part</option>
                    {PARTS.map(([value, name]) => (
                      <option key={value} value={value}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={addPart}
                  disabled={!selectedPart || parts.length >= MAX_PARTS}
                  className={`${buttonClass} border border-cyan-200 bg-cyan-50 text-cyan-800 dark:border-cyan-500/20 dark:bg-cyan-500/10 dark:text-cyan-200`}
                >
                  Add sentence part
                </button>
              </div>

              {selectedPart && (
                <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
                  {PARTS.find(([value]) => value === selectedPart)?.[2]}
                </p>
              )}

              <ol className="mt-4 space-y-2">
                {parts.map((part, index) => (
                  <li
                    key={`${part}-${index}`}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50"
                  >
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      {index + 1}. {partName(part)}
                    </span>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={() => movePart(index, -1)}
                        aria-label={`Move ${partName(part)} at position ${index + 1} earlier`}
                        className="min-h-9 rounded-lg border border-slate-300 px-3 text-xs dark:border-slate-600 disabled:opacity-40"
                      >
                        Earlier
                      </button>
                      <button
                        type="button"
                        disabled={index === parts.length - 1}
                        onClick={() => movePart(index, 1)}
                        aria-label={`Move ${partName(part)} at position ${index + 1} later`}
                        className="min-h-9 rounded-lg border border-slate-300 px-3 text-xs dark:border-slate-600 disabled:opacity-40"
                      >
                        Later
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setParts((previous) =>
                            previous.filter(
                              (_, position) => position !== index,
                            ),
                          )
                        }
                        aria-label={`Remove ${partName(part)} at position ${index + 1}`}
                        className="min-h-9 rounded-lg px-3 text-xs text-red-700 dark:text-red-300"
                      >
                        Remove
                      </button>
                    </div>
                  </li>
                ))}
              </ol>

              {!parts.length && (
                <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                  No pattern yet. Choose a sentence part and click “Add sentence
                  part”.
                </p>
              )}

              <label className="mt-4 block">
                <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Explanation or example (optional)
                </span>
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  maxLength={500}
                  rows={3}
                  dir="auto"
                  placeholder="Explain where this pattern is used. Include an example if available."
                  className={inputClass}
                />
              </label>
            </section>

            <fieldset className="border-t border-slate-200 pt-6 dark:border-slate-800">
              <legend className="text-base font-semibold text-slate-900 dark:text-white">
                3. Choose status
              </legend>

              <div className="mt-3 flex flex-wrap gap-4">
                {(["draft", "publish"] as const).map((value) => (
                  <label
                    key={value}
                    className="flex items-center gap-2 text-sm"
                  >
                    <input
                      type="radio"
                      name={`${formId}-status`}
                      value={value}
                      checked={status === value}
                      onChange={() => setStatus(value)}
                      className="accent-cyan-600"
                    />
                    {value === "draft"
                      ? "Draft — work in progress"
                      : "Publish — ready to read"}
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 dark:border-slate-800 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className={`${buttonClass} border border-slate-300 dark:border-slate-700`}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={`${buttonClass} bg-cyan-600 text-white hover:bg-cyan-700`}
              >
                {saving
                  ? "Saving..."
                  : isEditing
                    ? "Save changes"
                    : "Create structure"}
              </button>
            </div>
          </fieldset>
        </form>
      )}
    </div>
  );
}
