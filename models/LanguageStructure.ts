// models/LanguageStructure.ts

import mongoose, { Schema } from "mongoose";
import { LanguageStructureType } from "@/utils/types";

export const MAX_WORD_ORDERS_PER_LANGUAGE = 5;
export const MAX_CONSTITUENTS_PER_WORD_ORDER = 12;

export const WRITING_DIRECTIONS = [
  "left-to-right",
  "right-to-left",
  "top-to-bottom",
  "bottom-to-top",
  "boustrophedon",
  "mixed",
] as const;

export const CONSTITUENT_TYPES = [
  "subject",
  "verb",
  "object",
  "indirect-object",
  "complement",
  "adverbial",
  "auxiliary",
  "topic",
  "focus",
  "noun-phrase",
  "adjective",
  "adposition",
  "particle",
  "classifier",
  "other",
] as const;

const wordOrderPatternSchema = new Schema(
  {
    label: {
      type: String,
      trim: true,
      default: "",
      maxlength: 100,
    },

    constituents: {
      type: [
        {
          type: String,
          enum: CONSTITUENT_TYPES,
          required: true,
        },
      ],
      required: true,

      validate: {
        validator: (constituents: string[]) =>
          Array.isArray(constituents) &&
          constituents.length > 0 &&
          constituents.length <= MAX_CONSTITUENTS_PER_WORD_ORDER,
        message: `Each word-order pattern must contain between 1 and ${MAX_CONSTITUENTS_PER_WORD_ORDER} constituents.`,
      },
    },

    notes: {
      type: String,
      trim: true,
      default: "",
      maxlength: 500,
    },
  },
  {
    _id: true,
  },
);

const proposedWordOrderPatternSchema = new Schema(
  {
    label: {
      type: String,
      trim: true,
      default: "",
      maxlength: 100,
    },

    constituents: {
      type: [
        {
          type: String,
          enum: CONSTITUENT_TYPES,
          required: true,
        },
      ],
      required: true,

      validate: {
        validator: (constituents: string[]) =>
          Array.isArray(constituents) &&
          constituents.length > 0 &&
          constituents.length <= MAX_CONSTITUENTS_PER_WORD_ORDER,
        message: `Each proposed word-order pattern must contain between 1 and ${MAX_CONSTITUENTS_PER_WORD_ORDER} constituents.`,
      },
    },

    notes: {
      type: String,
      trim: true,
      default: "",
      maxlength: 500,
    },
  },
  {
    _id: true,
  },
);

const languageStructureSchema = new Schema<LanguageStructureType>(
  {
    language: {
      type: Schema.Types.ObjectId,
      ref: "Language",
      required: true,
      index: true,
    },

    writingDirections: {
      type: [
        {
          type: String,
          enum: WRITING_DIRECTIONS,
          trim: true,
        },
      ],
      default: [],
    },

    wordOrders: {
      type: [wordOrderPatternSchema],
      default: [],

      validate: {
        validator: (wordOrders: unknown[]) =>
          Array.isArray(wordOrders) &&
          wordOrders.length <= MAX_WORD_ORDERS_PER_LANGUAGE,
        message: `A language can have a maximum of ${MAX_WORD_ORDERS_PER_LANGUAGE} word-order patterns.`,
      },
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    lastUpdatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },

    status: {
      type: String,
      enum: [
        "draft",
        "published",
        "archived",
        "pending_deletion",
      ],
      default: "published",
    },

    editRequest: {
      requestedBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
      },

      requestedAt: {
        type: Date,
      },

      proposedChanges: {
        language: {
          type: Schema.Types.ObjectId,
          ref: "Language",
        },

        writingDirections: {
          type: [
            {
              type: String,
              enum: WRITING_DIRECTIONS,
              trim: true,
            },
          ],
        },

        wordOrders: {
          type: [proposedWordOrderPatternSchema],
        },

        status: {
          type: String,
          enum: ["draft", "published", "archived"],
        },
      },

      requestNote: {
        type: String,
        trim: true,
        maxlength: 1000,
      },
    },

    deletionRequest: {
      requestedBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
      },

      requestedAt: {
        type: Date,
      },

      previousStatus: {
        type: String,
        enum: ["draft", "published", "archived"],
      },

      requestNote: {
        type: String,
        trim: true,
        maxlength: 1000,
      },
    },
  },
  {
    timestamps: true,
  },
);

const LanguageStructure =
  mongoose.models.LanguageStructure ||
  mongoose.model<LanguageStructureType>(
    "LanguageStructure",
    languageStructureSchema,
  );

export default LanguageStructure;