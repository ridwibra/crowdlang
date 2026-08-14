import mongoose, { Schema, type Document, type Model } from "mongoose";

export interface IMarquee extends Document {
  text: string;
  link?: string;
  isActive: boolean;
  speed: number;
  backgroundColor: string;
  textColor: string;
  createdAt: Date;
  updatedAt: Date;
}

const MarqueeSchema = new Schema<IMarquee>(
  {
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    link: {
      type: String,
      trim: true,
      default: "",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    speed: {
      type: Number,
      default: 25,
      min: 8,
      max: 120,
    },
    backgroundColor: {
      type: String,
      default: "#0f766e",
      trim: true,
    },
    textColor: {
      type: String,
      default: "#ffffff",
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

const Marquee: Model<IMarquee> =
  mongoose.models.Marquee ||
  mongoose.model<IMarquee>("Marquee", MarqueeSchema);

export default Marquee;