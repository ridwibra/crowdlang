import { LanguageType } from "@/utils/types";
import mongoose, { Schema } from "mongoose";

const languageSchema = new Schema<LanguageType>(
  {
    name: { type: String, required: true, trim: true, unique: true },

   countries: {
      type: [String],
      required: true,
      set: (arr: string[]) => arr.map((c) => c.trim()),
    },

    status: {
      type: String,
      enum: ["active", "archived"],
      default: "active",
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

const Language =
  mongoose.models.Language ||
  mongoose.model<LanguageType>("Language", languageSchema);

export default Language;
