import mongoose from "mongoose";

const moodSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    emotion: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      enum: ["happy", "sad", "angry", "fear", "surprise", "disgust", "neutral"],
    },
    query: { type: String, default: "" },
    mode: { type: String, enum: ["match", "lift"], default: "match" },
    source: { type: String, default: "Deezer" },
  },
  { timestamps: true }
);

export default mongoose.models.Mood || mongoose.model("Mood", moodSchema);