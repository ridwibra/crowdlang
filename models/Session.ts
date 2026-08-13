import { SessionType } from "@/utils/types";
import mongoose, { Schema } from "mongoose";

const sessionSchema = new Schema<SessionType>({

  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  token: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true },
  ipAddress: { type: String },
  userAgent: { type: String },
}, { timestamps: true });

const Session = mongoose.models.Session || mongoose.model<SessionType>("Session", sessionSchema);
export default Session;