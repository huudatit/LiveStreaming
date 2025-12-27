import mongoose from "mongoose";

const vodSchema = new mongoose.Schema(
  {
    vodId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    streamId: {
      type: String,
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    thumbnail: {
      type: String,
      default: null,
    },
    streamerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    // Snapshot streamer info
    streamerUsername: {
      type: String,
      required: true,
    },
    streamerDisplayName: {
      type: String,
      required: true,
    },
    streamerAvatar: {
      type: String,
      default: null,
    },
    views: {
      type: Number,
      default: 0,
    },
    vodLink: {
      type: String,
      default: null,
    },
    // LiveKit Egress info
    egressId: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ["RECORDING", "PROCESSING", "READY", "FAILED"],
      default: "PROCESSING",
      index: true,
    },
    duration: {
      type: Number,
      default: 0, // in seconds
    },
    fileSize: {
      type: Number,
      default: 0, // in bytes
    },
    recordedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Index for listing VODs
vodSchema.index({ status: 1, createdAt: -1 });
vodSchema.index({ streamerId: 1, status: 1 });
vodSchema.index({ views: -1 }); // for popular sorting

export default mongoose.model("VOD", vodSchema);