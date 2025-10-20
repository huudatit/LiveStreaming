import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  streamId: {
    type: String,
    required: true,
    index: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  username: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
    maxlength: 500,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 86400, // Auto delete after 24 hours
  },
});

export default mongoose.model("Message", messageSchema);
