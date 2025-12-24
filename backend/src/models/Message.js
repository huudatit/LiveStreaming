import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  streamId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Stream",
    required: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  displayName: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
    maxlength: 500,
  },
  type: {
    type: String,
    enum: ['text', 'system'],
    default: 'text'
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

// Tự động xóa messages sau 24 giờ
messageSchema.index({ createdAt: 1 }, { expireAfterSeconds: 86400 });

export default mongoose.model("Message", messageSchema);
