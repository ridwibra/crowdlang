import { AccountType } from "@/utils/types";
import mongoose, { Schema } from "mongoose";

const accountSchema = new Schema<AccountType>({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  accountId: { type: String, required: true }, 
  providerId: { type: String, required: true }, 
  password: { type: String }, // Hashed password storage
  
  accessToken: { type: String },
  refreshToken: { type: String },
  idToken: { type: String },
  
  // Corrected field names per Core Schema
  accessTokenExpiresAt: { type: Date },
  refreshTokenExpiresAt: { type: Date },
  
  scope: { type: String },
  passwordResetToken: { type: String },
}, { timestamps: true });

const Account = mongoose.models.Account || mongoose.model<AccountType>("Account", accountSchema);
export default Account;