import mongoose, { Schema } from "mongoose";

const trackerSchema = new Schema(
  {
    sessionId: {
      type: String,
      required: true,
      maxlength: 200,
    },

    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    isAuthenticated: {
      type: Boolean,
      default: false,
    },

    actionType: {
      type: String,
      required: true,
      maxlength: 100,
    },

    pathname: {
      type: String,
      required: true,
      maxlength: 2048,
    },

    // Durations are expected to be seconds.
    duration: {
      type: Number,
      min: 0,
    },

    startTime: {
      type: Date,
    },

    endTime: {
      type: Date,
    },

    // Reels
    reelId: {
      type: Schema.Types.ObjectId,
      ref: "Reel",
    },

    mediaType: {
      type: String,
      maxlength: 100,
    },

    playDuration: {
      type: Number,
      min: 0,
    },

    completionRate: {
      type: Number,
      min: 0,
    },

    interactionType: {
      type: String,
      maxlength: 100,
    },

    // Maps: these describe the map interaction.
    selectedLanguage: {
      type: String,
      maxlength: 200,
    },

    derivedCountries: {
      type: [String],
      default: undefined,
    },

    region: {
      type: String,
      maxlength: 200,
    },

    zoomLevel: {
      type: Number,
    },

    mapMode: {
      type: String,
      maxlength: 100,
    },

    // Linguistic resources
    resourceType: {
      type: String,
      enum: ["language", "alphabet", "essay", "table"],
    },

    resourceId: {
      type: Schema.Types.ObjectId,
    },

    language: {
      type: String,
      maxlength: 200,
    },

    interactionMetadata: {
      type: Schema.Types.Mixed,
    },

    // Device information
    // Retained for compatibility; the API below does not collect raw IPs.
    ip: {
      type: String,
    },

    userAgent: {
      type: String,
      maxlength: 2000,
    },

    device: {
      type: String,
      maxlength: 200,
    },

    browser: {
      type: String,
      maxlength: 200,
    },

    os: {
      type: String,
      maxlength: 200,
    },

    // Approximate visitor location, not map-selected countries.
    countryCode: {
      type: String,
      default: "",
      maxlength: 2,
    },

    country: {
      type: String,
      default: "",
      maxlength: 200,
    },

    city: {
      type: String,
      default: "",
      maxlength: 200,
    },
  },
  {
    timestamps: true,
  },
);

trackerSchema.index({ createdAt: -1 });
trackerSchema.index({ userId: 1, createdAt: -1 });
trackerSchema.index({ sessionId: 1, createdAt: -1 });

const Tracker =
  mongoose.models.Tracker ||
  mongoose.model("Tracker", trackerSchema);

export default Tracker;