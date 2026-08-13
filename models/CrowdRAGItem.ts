// models/CrowdRAGItem.ts
import mongoose, { Schema } from "mongoose";

export type CrowdSourceType =
  | "alphabet"
  | "essay"
  | "language"
  | "language-fallback"
  | "reel"
  | "table"
  | "table-reverse";

const ragSchema = new Schema(
  {
    sourceType: {
      type: String,
      required: true,
      enum: [
        "alphabet",
        "essay",
        "language",
        "language-fallback",
        "reel",
        "table",
        "table-reverse",
      ],
    },
    sourceId: {
      type: String,
      required: true,
      index: true,
    },
    text: {
      type: String,
      required: true,
      trim: true,
    },
    language: {
      type: String,
      default: "",
      index: true,
    },
    embedding: {
      type: [Number],
      required: true,
    },
  },
  { timestamps: true },
);

ragSchema.index({ sourceType: 1, sourceId: 1 });

const CrowdRAGItem =
  mongoose.models.CrowdRAGItem ||
  mongoose.model("CrowdRAGItem", ragSchema);

export default CrowdRAGItem;