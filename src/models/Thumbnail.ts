import mongoose from "mongoose";

export interface IThumbnail extends Document {
  userId: string;
  title: string;
  description?: string;
  style:
    | "Bold & Graphic"
    | "Tech/Futuristic"
    | "Minimalist"
    | "Photorealistic"
    | "Illustrated";
  aspect_ratio?: "16:9" | "1:1" | "9:16";
  color_scheme?:
    | "vibrant"
    | "sunset"
    | "forest"
    | "neon"
    | "purple"
    | "monochrome"
    | "ocean"
    | "pastel";
  text_overlay?: boolean;
  image_url?: string;
  prompt_used?: string;
  user_prompt?: string;
  reference_images?: string[]; // ✅ NUEVO (hasta 2 URLs)
  isGenerating?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  isPublic?: boolean;
}

const ThumbnailSchema = new mongoose.Schema<IThumbnail>(
  {
    userId: { type: String, ref: "User", required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    style: {
      type: String,
      required: true,
      enum: [
        "Bold & Graphic",
        "Tech/Futuristic",
        "Minimalist",
        "Photorealistic",
        "Illustrated",
      ],
    },
    aspect_ratio: {
      type: String,
      required: true,
      enum: ["16:9", "1:1", "9:16"],
      default: "16:9",
    },
    color_scheme: {
      type: String,
      enum: [
        "vibrant",
        "sunset",
        "forest",
        "neon",
        "purple",
        "monochrome",
        "ocean",
        "pastel",
      ],
    },
    text_overlay: { type: Boolean, default: false },
    image_url: { type: String, default: "" },
    prompt_used: { type: String },
    user_prompt: { type: String },

    // ✅ NUEVO
    reference_images: {
      type: [String],
      default: [],
      validate: {
        validator: (arr: string[]) => Array.isArray(arr) && arr.length <= 2,
        message: "reference_images can have at most 2 items",
      },
    },

    isGenerating: { type: Boolean, default: true },
    isPublic: { type: Boolean, default: false, index: true },
  },
  { timestamps: true },
);

const Thumbnail =
  mongoose.models.Thumbnail ||
  mongoose.model<IThumbnail>("Thumbnail", ThumbnailSchema);

export default Thumbnail;
