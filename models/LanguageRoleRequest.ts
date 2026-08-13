import mongoose, { Schema } from "mongoose";

export type LanguageRole = "user" | "editor" | "expert";

export type LanguageRoleRequestStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "cancelled";

export interface LanguageRoleRequestType {
  user: mongoose.Types.ObjectId;
  language: mongoose.Types.ObjectId;

  currentRole: LanguageRole;
  requestedRole: "editor" | "expert";
  justification: string;

  status: LanguageRoleRequestStatus;

  reviewedBy?: mongoose.Types.ObjectId | null;
  reviewedAt?: Date | null;
  reviewNote?: string;

  createdAt?: Date;
  updatedAt?: Date;
}

const languageRoleRequestSchema = new Schema<LanguageRoleRequestType>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    language: {
      type: Schema.Types.ObjectId,
      ref: "Language",
      required: true,
    },

    currentRole: {
      type: String,
      enum: ["user", "editor", "expert"],
      default: "user",
      required: true,
    },

    requestedRole: {
      type: String,
      enum: ["editor", "expert"],
      required: true,
    },

    justification: {
      type: String,
      required: true,
      trim: true,
      minlength: 20,
      maxlength: 2000,
    },

    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "cancelled"],
      default: "pending",
      required: true,
    },

    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    reviewedAt: {
      type: Date,
      default: null,
    },

    reviewNote: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: "",
    },
  },
  {
    timestamps: true,
  },
);

/*
 * Prevent a user from submitting multiple pending requests
 * for the same language.
 */
languageRoleRequestSchema.index(
  {
    user: 1,
    language: 1,
    status: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      status: "pending",
    },
  },
);

/*
 * Used by the admin requests endpoint:
 *
 * GET /api/activity/requests?status=pending&sortBy=createdAt
 * GET /api/activity/requests?status=approved&sortBy=updatedAt
 * GET /api/activity/requests?status=all&sortBy=requestedRole
 */
languageRoleRequestSchema.index({
  status: 1,
  createdAt: -1,
});

languageRoleRequestSchema.index({
  status: 1,
  updatedAt: -1,
});

languageRoleRequestSchema.index({
  status: 1,
  requestedRole: 1,
});

languageRoleRequestSchema.index({
  createdAt: -1,
});

languageRoleRequestSchema.index({
  updatedAt: -1,
});

const LanguageRoleRequest =
  mongoose.models.LanguageRoleRequest ||
  mongoose.model<LanguageRoleRequestType>(
    "LanguageRoleRequest",
    languageRoleRequestSchema,
  );

export default LanguageRoleRequest;