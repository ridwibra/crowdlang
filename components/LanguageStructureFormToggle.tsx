"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const MAX_PARTS = 25;

const DIRECTIONS = [
  [
    "left-to-right",
    "Left to right",
    "Text runs horizontally from left to right within each line.",
  ],
  [
    "right-to-left",
    "Right to left",
    "Text runs horizontally from right to left within each line.",
  ],
  [
    "top-to-bottom",
    "Top to bottom",
    "Text runs vertically from top to bottom within each column; column order is unspecified.",
  ],
  [
    "bottom-to-top",
    "Bottom to top",
    "Text runs vertically from bottom to top within each column; column order is unspecified.",
  ],
  [
    "top-to-bottom-right-to-left",
    "Top to bottom; columns right to left",
    "Text runs down each column, with successive columns positioned to the left.",
  ],
  [
    "top-to-bottom-left-to-right",
    "Top to bottom; columns left to right",
    "Text runs down each column, with successive columns positioned to the right.",
  ],
  [
    "bottom-to-top-right-to-left",
    "Bottom to top; columns right to left",
    "Text runs up each column, with successive columns positioned to the left.",
  ],
  [
    "bottom-to-top-left-to-right",
    "Bottom to top; columns left to right",
    "Text runs up each column, with successive columns positioned to the right.",
  ],
  [
    "boustrophedon",
    "Boustrophedon / alternating lines",
    "Successive horizontal lines alternate between left-to-right and right-to-left directions.",
  ],
  [
    "bidirectional",
    "Bidirectional text",
    "Left-to-right and right-to-left text occur within the same passage, with a primary direction governing the overall layout.",
  ],
  [
    "mixed",
    "Mixed directions",
    "Different writing directions or layouts are used depending on the script, passage, or writing context.",
  ],
  [
    "unspecified",
    "Unspecified direction",
    "The writing direction has not been recorded or established.",
  ],
] as const;

const PARTS = [
  [
    "subject",
    "Subject",
    "A grammatical argument of the predicate; it is not necessarily the topic or the person performing an action.",
  ],
  [
    "verb",
    "Verb",
    "A word expressing an action, event, or state; distinct from the larger predicate.",
  ],
  [
    "predicate",
    "Predicate",
    "The expression that attributes an action, event, property, or state to the subject; it may be verbal or nonverbal.",
  ],
  [
    "object",
    "Direct object",
    "A core argument of a transitive verb, distinct from the subject; often the entity affected by the event.",
  ],
  [
    "indirect-object",
    "Indirect object",
    "A core argument distinct from the subject and direct object, often expressing a recipient; its identification depends on the language.",
  ],
  [
    "complement",
    "Complement",
    "An expression selected by a word or construction to complete its grammatical structure or meaning; complements can include objects and clauses.",
  ],
  [
    "predicative-complement",
    "Predicative complement",
    "An expression attributing a property, identity, or state to a subject or object, such as 'happy' in 'She is happy'.",
  ],
  [
    "adverbial",
    "Adverbial",
    "An expression providing information such as time, place, manner, reason, or frequency; it need not be an adverb.",
  ],
  [
    "auxiliary",
    "Auxiliary",
    "A grammatical verb or marker accompanying a predicate and expressing information such as tense, aspect, mood, or voice.",
  ],
  [
    "copula",
    "Copula",
    "A linking element connecting a subject with a nonverbal predicate, such as 'is' in 'She is a teacher'.",
  ],
  [
    "topic",
    "Topic",
    "The entity or matter about which an utterance provides information; it need not be the grammatical subject.",
  ],
  [
    "focus",
    "Focus",
    "The part of an utterance highlighted as informative or contrastive in its context.",
  ],
  [
    "noun",
    "Noun",
    "A word typically referring to an entity, place, substance, event, or abstract concept.",
  ],
  [
    "proper-noun",
    "Proper noun",
    "A noun used as the name of a particular person, place, organization, or other entity.",
  ],
  [
    "pronoun",
    "Pronoun",
    "A word that can function as a noun phrase and refer to participants or entities, such as 'I', 'you', or 'they'.",
  ],
  [
    "noun-phrase",
    "Noun phrase",
    "A phrase centered on a noun or pronoun, alone or with dependents; it can function as a subject, object, or another constituent.",
  ],
  [
    "verb-phrase",
    "Verb phrase",
    "A phrase centered on a verb, possibly including auxiliaries, complements, and modifiers; its boundaries depend on the grammatical analysis.",
  ],
  [
    "adjective",
    "Adjective / adjective phrase",
    "An adjective, alone or with dependents, expressing a property; it may modify a noun or function predicatively.",
  ],
  [
    "adverb",
    "Adverb / adverb phrase",
    "An adverb, alone or with dependents, modifying a verb, adjective, another adverb, or a clause.",
  ],
  [
    "determiner",
    "Determiner",
    "A word specifying the reference of a noun phrase, such as an article or a demonstrative used with a noun.",
  ],
  [
    "numeral",
    "Numeral",
    "A word or expression indicating a number or numerical quantity.",
  ],
  [
    "possessor",
    "Possessor",
    "An expression identifying an entity associated with another, often through ownership, kinship, or a part-whole relationship.",
  ],
  [
    "adposition",
    "Adposition",
    "A grammatical word, such as a preposition or postposition, expressing a relation between its complement and another element.",
  ],
  [
    "adpositional-phrase",
    "Adpositional phrase",
    "A phrase consisting of an adposition and its complement, such as 'in the house'.",
  ],
  [
    "coordinating-conjunction",
    "Coordinating conjunction",
    "A word linking words, phrases, or clauses without making one subordinate to the other, such as 'and' or 'or'.",
  ],
  [
    "subordinating-conjunction",
    "Subordinating conjunction",
    "A word introducing or linking a subordinate clause, such as 'because' or 'although'.",
  ],
  [
    "relative-clause",
    "Relative clause",
    "A clause modifying a noun or nominal expression, such as 'that I bought' in 'the book that I bought'.",
  ],
  [
    "complement-clause",
    "Complement clause",
    "A clause functioning as a complement, such as 'that she left' in 'I know that she left'.",
  ],
  [
    "adverbial-clause",
    "Adverbial clause",
    "A clause functioning as an adverbial, expressing a relation such as time, condition, reason, or concession.",
  ],
  [
    "negation-marker",
    "Negation marker",
    "A word, particle, or affix expressing negation; it may be a separate word or part of another word.",
  ],
  [
    "question-marker",
    "Question marker",
    "A word, particle, or affix marking a question; not all languages use an explicit question marker.",
  ],
  [
    "particle",
    "Particle",
    "A grammatical word whose specific function depends on the language, such as marking emphasis or a discourse relation.",
  ],
  [
    "classifier",
    "Classifier",
    "A grammatical element classifying a noun or its referent, often used in counting or other noun-related constructions.",
  ],
  [
    "vocative",
    "Vocative",
    "An expression directly addressing someone, such as 'Maria' in 'Maria, come here'.",
  ],
  [
    "interjection",
    "Interjection",
    "A word or expression conveying a reaction, emotion, or interactional response, such as 'oh' or 'wow'.",
  ],
  [
    "other",
    "Other sentence part",
    "Another grammatical element; describe its form and function in the notes.",
  ],
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
