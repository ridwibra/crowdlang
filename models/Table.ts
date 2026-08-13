// models/Language.ts
import {TableType } from "@/utils/types";
import mongoose, { Schema } from "mongoose";

const tableSchema = new Schema<TableType>(
  {
    text: { type: String, required: true },

    translation: { type: String, required: true },

    textType: {
      type: String,
      enum: ["word", "sentence", "expression", "passage"],
      required: true,
    },

    status: {
      type: String,
      enum: ["pending", "published", "rejected"],
      default: "pending",
    },

    domain: { type: String },

    createdBy: {
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

    language: {
      type: Schema.Types.ObjectId,
      ref: "Language",
      required: true,
    },
  },
  { timestamps: true }
);


const Table =
  mongoose.models.Table ||
  mongoose.model<TableType>("Table", tableSchema);

export default Table;
