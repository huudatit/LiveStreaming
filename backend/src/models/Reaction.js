import mongoose from "mongoose";

const reactionSchema = new mongoose.Schema(
  {
    streamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Stream",
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false, // Cho phép guest reactions
    },
    username: {
      type: String,
      required: true,
    },
    emoji: {
      type: String,
      required: true,
      enum: ["👍", "❤️", "😂", "😮", "😢", "🎉"],
    },
  },
  {
    timestamps: true,
  }
);

// Tự động xóa reactions sau 1 giờ
reactionSchema.index({ createdAt: 1 }, { expireAfterSeconds: 3600 });

export default mongoose.model("Reaction", reactionSchema);
