export const WRITING_DIRECTION_OPTIONS = [
  {
    value: "left-to-right",
    label: "Left to right",
    abbreviation: "LTR",
    description: "Text begins on the left and progresses to the right.",
  },
  {
    value: "right-to-left",
    label: "Right to left",
    abbreviation: "RTL",
    description: "Text begins on the right and progresses to the left.",
  },
  {
    value: "top-to-bottom",
    label: "Top to bottom",
    abbreviation: "TTB",
    description: "Text begins at the top and progresses downward.",
  },
  {
    value: "bottom-to-top",
    label: "Bottom to top",
    abbreviation: "BTT",
    description: "Text begins at the bottom and progresses upward.",
  },
  {
    value: "boustrophedon",
    label: "Boustrophedon",
    abbreviation: "Boust.",
    description: "Writing direction alternates from line to line.",
  },
  {
    value: "mixed",
    label: "Mixed or context-dependent",
    abbreviation: "Mixed",
    description: "Direction varies by script, historical period, medium, or context.",
  },
] as const;

export const CONSTITUENT_OPTIONS = [
  {
    value: "subject",
    label: "Subject",
    abbreviation: "S",
    description: "The actor, experiencer, or grammatical subject.",
  },
  {
    value: "verb",
    label: "Verb / predicate",
    abbreviation: "V",
    description: "The action, event, state, or predicate.",
  },
  {
    value: "object",
    label: "Direct object",
    abbreviation: "O",
    description: "The primary object or patient-like argument.",
  },
  {
    value: "indirect-object",
    label: "Indirect object",
    abbreviation: "IO",
    description: "A recipient, beneficiary, or secondary object.",
  },
  {
    value: "complement",
    label: "Complement",
    abbreviation: "C",
    description: "A required complement, such as a predicate adjective or noun.",
  },
  {
    value: "adverbial",
    label: "Adverbial",
    abbreviation: "Adv",
    description: "A time, place, manner, reason, or other adjunct.",
  },
  {
    value: "auxiliary",
    label: "Auxiliary",
    abbreviation: "Aux",
    description: "A helping verb, tense marker, modal, or auxiliary element.",
  },
  {
    value: "topic",
    label: "Topic",
    abbreviation: "Top",
    description: "The discourse topic or what the clause is about.",
  },
  {
    value: "focus",
    label: "Focus",
    abbreviation: "Foc",
    description: "The focused or emphasized constituent.",
  },
  {
    value: "noun-phrase",
    label: "Noun phrase",
    abbreviation: "NP",
    description: "A noun phrase when a grammatical role is not specified.",
  },
  {
    value: "adjective",
    label: "Adjective / adjectival phrase",
    abbreviation: "Adj",
    description: "An adjective or adjectival phrase.",
  },
  {
    value: "adposition",
    label: "Adposition",
    abbreviation: "Adp",
    description: "A preposition, postposition, or related adposition.",
  },
  {
    value: "particle",
    label: "Particle",
    abbreviation: "Part",
    description: "A grammatical particle.",
  },
  {
    value: "classifier",
    label: "Classifier",
    abbreviation: "Cl",
    description: "A noun classifier or similar grammatical marker.",
  },
  {
    value: "other",
    label: "Other constituent",
    abbreviation: "Other",
    description: "A constituent that needs a custom label in the notes.",
  },
] as const;

export const MAX_WORD_ORDERS = 5;
export const MAX_CONSTITUENTS_PER_ORDER = 12;

export type WritingDirection =
  (typeof WRITING_DIRECTION_OPTIONS)[number]["value"];

export type ConstituentType =
  (typeof CONSTITUENT_OPTIONS)[number]["value"];

export interface WordOrderPattern {
  _id: string;
  label: string;
  constituents: ConstituentType[];
  notes: string;
}

export interface LanguageStructureData {
  _id: string;
  language: string;
  writingDirections: WritingDirection[];
  wordOrders: WordOrderPattern[];
}