import mongoose, { Schema } from "mongoose";

export type CrowdSourceType =
  | "alphabet"
  | "essay"
  | "language"
  | "language-fallback"
  | "marquee"
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
        "marquee",
        "reel",
        "table",
        "table-reverse",
      ],
      index: true,
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
      trim: true,
      index: true,
    },

    title: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },

    keywords: {
      type: [String],
      default: [],
      index: true,
    },

    category: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },

    level: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },

    domain: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },

    embedding: {
      type: [Number],
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

ragSchema.index({ sourceType: 1, sourceId: 1 });
ragSchema.index({ language: 1, sourceType: 1 });
ragSchema.index({ title: "text", keywords: "text", text: "text" });

const CrowdRAGItem =
  mongoose.models.CrowdRAGItem ||
  mongoose.model("CrowdRAGItem", ragSchema);

export default CrowdRAGItem;