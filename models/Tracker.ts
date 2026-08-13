import mongoose, { Schema } from "mongoose";

const trackerSchema = new Schema({
  sessionId: { type: String, required: true },

  userId: { type: Schema.Types.ObjectId, ref: "User", required: false },
  isAuthenticated: { type: Boolean, default: false },

  actionType: { type: String, required: true },

  pathname: { type: String, required: true },
  duration: { type: Number },
  startTime: { type: Date },
  endTime: { type: Date },

  // Reels
  reelId: { type: Schema.Types.ObjectId, ref: "Reel" },
  mediaType: { type: String },
  playDuration: { type: Number },
  completionRate: { type: Number },
  interactionType: { type: String },

  // Maps
  selectedLanguage: { type: String },
  derivedCountries: { type: [String] },
  region: { type: String },
  zoomLevel: { type: Number },
  mapMode: { type: String },

  // Linguistic resources (homepage + language pages)
  resourceType: { type: String, enum: ["language", "alphabet", "essay", "table"] },
  resourceId: { type: Schema.Types.ObjectId },
  language: { type: String },
  interactionMetadata: { type: Schema.Types.Mixed },

  // Device info
  ip: { type: String },
  userAgent: { type: String },
  device: { type: String },
  browser: { type: String },
  os: { type: String },

}, { timestamps: true });

const Tracker = mongoose.models.Tracker || mongoose.model("Tracker", trackerSchema);

export default Tracker