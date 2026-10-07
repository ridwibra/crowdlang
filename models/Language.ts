// models/Language.ts
import { LanguageType } from "@/utils/types";
import mongoose, { Schema } from "mongoose";

const languageSchema = new Schema<LanguageType>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },

    countries: {
      type: [String],
      required: true,
      set: (arr: string[]) => arr.map((country) => country.trim()),
    },

    status: {
      type: String,
      enum: ["active", "archived", "pending_deletion"],
      default: "active",
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
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
        name: {
          type: String,
          trim: true,
        },

        countries: {
          type: [String],
          set: (arr: string[]) => arr.map((country) => country.trim()),
        },

        status: {
          type: String,
          enum: ["active", "archived"],
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
        enum: ["active", "archived"],
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

const Language =
  mongoose.models.Language ||
  mongoose.model<LanguageType>("Language", languageSchema);

export default Language;