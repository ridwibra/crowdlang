// models/Alphabet.ts
import mongoose, { Schema } from "mongoose";
import { AlphabetType } from "@/utils/types";

const alphabetSchema = new Schema<AlphabetType>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    language: {
      type: Schema.Types.ObjectId,
      ref: "Language",
      required: true,
    },

    letters: [
      {
        character: { type: String, required: true },
        order: { type: Number, required: true },
        ipa: { type: String },
        audioUrl: { type: String },
      },
    ],

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
      enum: ["draft", "published", "archived"],
      default: "published",
    },
  },
  { timestamps: true }
);


const Alphabet =
  mongoose.models.Alphabet ||
  mongoose.model<AlphabetType>("Alphabet", alphabetSchema);

export default Alphabet;
