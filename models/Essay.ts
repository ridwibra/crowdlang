import { EssayType } from "@/utils/types";
import mongoose, { Schema } from "mongoose";

const moderationHistorySchema = new Schema(
  {
    previousStatus: {
      type: String,
      enum: ["draft", "pending", "published", "rejected"],
      required: true,
    },

    nextStatus: {
      type: String,
      enum: ["draft", "pending", "published", "rejected"],
      required: true,
    },

    comment: {
      type: String,
      trim: true,
      default: "",
      maxlength: 2000,
    },

    changedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    changedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    _id: true,
  },
);

const essaySchema = new Schema<EssayType>(
  {
    title: {
      type: String,
      required: true,
    },

    category: {
      type: String,
    },

    body: {
      type: String,
    },

    translationTitle: {
      type: String,
    },

    translationBody: {
      type: String,
    },

    images: [
      {
        image_url: {
          type: String,
        },

        public_id: {
          type: String,
        },
      },
    ],

    status: {
      type: String,
      enum: ["draft", "pending", "published", "rejected"],
      default: "pending",
    },

    level: {
      type: String,
      enum: ["beginner", "intermediate", "advanced"],
    },

    tags: [
      {
        type: String,
      },
    ],

    language: {
      type: Schema.Types.ObjectId,
      ref: "Language",
      required: true,
    },

    author: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    editedBy: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    approvedBy: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    moderationHistory: {
      type: [moderationHistorySchema],
      default: [],
    },
  },
  {
    timestamps: true,
  },
);

const Essay =
  mongoose.models.Essay ||
  mongoose.model<EssayType>("Essay", essaySchema);

export default Essay;