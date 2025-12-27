import mongoose from "mongoose";

const participantSchema = new mongoose.Schema(
  {

  }
);


const streamSchema = new mongoose.Schema(
  {
    ingressId: { type: String },
    egressId: { type: String },
    streamKey: { type: String },
    serverUrl: { type: String },
    username: {
      type: String,
      required: true,
      index: true,
    },
    displayName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    roomName: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      default: "Untitled Stream",
    },
    description: { type: String, default: "" },
    streamerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    isLive: { type: Boolean, default: true },
    status: {
      type: String,
      enum: ["preparing", "live", "ended"],
      default: "preparing",
    },
    viewerCount: { type: Number, default: 0 },
    peakViewerCount: { type: Number, default: 0 }, 
    startedAt: { type: Date, default: Date.now },
    endedAt: { type: Date },
    duration: { type: Number, default: 0 },
    thumbnailUrl: { type: String },
    recordingUrl: { type: String }, 
    recordingStatus: {
      type: String,
      enum: ["none", "recording", "processing", "ready", "failed"],
      default: "none",
    },
    // Danh sách người bị ban
    bannedUsers: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        username: { type: String },
        bannedAt: { type: Date, default: Date.now },
        reason: { type: String },
      },
    ],
    // Thống kê
    stats: {
      totalMessages: { type: Number, default: 0 },
      totalReactions: { type: Number, default: 0 },
      totalViews: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

// Tự tính duration khi set endedAt
streamSchema.pre("save", function (next) {
  if (this.isModified("endedAt") && this.endedAt) {
    this.duration = Math.max(
      0,
      Math.floor((this.endedAt - this.startedAt) / 1000)
    );
  }
  next();
});

// Index cho tìm kiếm video đã lưu
streamSchema.index({ status: 1, createdAt: -1 });
streamSchema.index({ isLive: 1, startedAt: -1 });
streamSchema.index({ recordingStatus: 1 });

export default mongoose.model("Stream", streamSchema);