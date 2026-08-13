// models/User.ts
import mongoose, { Schema } from "mongoose";
import { UserType } from "@/utils/types";

const userSchema = new Schema<UserType>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    emailVerified: { type: Boolean, default: false },
    image: { type: String },

    role: {
      type: String,
      enum: ["user", "staff", "admin"],
      default: "user",
    },

    avatar: {
      image_url: { type: String },
      public_id: { type: String },
    },
    bio: { type: String },
    passwordless: { type: Boolean, default: false },
    betterAuthId: { type: String },

    // NEW FIELDS
    lastLogin: { type: Date },
    lastLogout: { type: Date },

    lastLogins: [{ type: Date }],
    lastLogouts: [{ type: Date }],

    languageRoles: {
      type: Map,
      of: String,
      default: {},
    },
  },
  { timestamps: true }
);

const User =
  mongoose.models.User ||
  mongoose.model<UserType>("User", userSchema, "user");

export default User;
