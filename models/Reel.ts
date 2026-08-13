// models/Reel.ts
import { ReelType } from "@/utils/types";
import mongoose, { Schema } from "mongoose";

const commentSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    text: { type: String, required: true, trim: true },
    likes: {
      type: [Schema.Types.ObjectId],
      ref: "User",
      default: [],
    },
      dislikes: {
      type: [Schema.Types.ObjectId],
      ref: "User",
      default: [],
    },
    status: {
      type: String,
      enum: ["visible", "hidden", "deleted"],
      default: "visible",
    },
  },
  { timestamps: true }
);

const reelSchema = new Schema<ReelType>(
  {
  caption: { type: String, required: true },

  media: {
      image_url: { type: String, required: true },
      public_id: { type: String, required: true },
    },

  tags: { type: [String], default: [] },

  transcription: {
    type: String,
  },
  translation:  {
    type: String,
  },

    type: {
  type: String,
  enum: ["video", "audio"],
  required: true,
  default: "video",
      },
  author: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

  approvedBy: {
      type: [Schema.Types.ObjectId],
      ref: "User",
      default: [],
    },

  language: {
      type: Schema.Types.ObjectId,
      ref: "Language",
      required: true,
    },

  likes: {
      type: [Schema.Types.ObjectId],
      ref: "User",
      default: [],
    },
  dislikes: {
      type: [Schema.Types.ObjectId],
      ref: "User",
      default: [],
    },

comments: {
      type: [commentSchema],
      default: [],
    },
  },
  { timestamps: true }
);


const Reel =
  mongoose.models.Reel ||
  mongoose.model<ReelType>("Reel", reelSchema);

export default Reel;
