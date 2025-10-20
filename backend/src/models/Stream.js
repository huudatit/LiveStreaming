import mongoose from "mongoose";

const streamSchema = new mongoose.Schema(
  {
    streamId: {
      type: String,
      required: true,
      unique: true,
    },
    title: {
      type: String,
      required: true,
      default: "Untitled Stream",
    },
    description: {
      type: String,
      default: "",
    },
    streamer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["preparing", "live", "ended"],
      default: "preparing",
    },
    viewerCount: {
      type: Number,
      default: 0,
    },
    startedAt: {
      type: Date,
    },
    endedAt: {
      type: Date,
    },
    thumbnailUrl: {
      type: String,
    },
    recordingUrl: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Stream", streamSchema);
