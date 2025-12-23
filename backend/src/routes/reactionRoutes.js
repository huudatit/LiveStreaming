import express from "express";
import Reaction from "../models/Reaction.js";
import mongoose from "mongoose";

const router = express.Router();

// Get reaction statistics for a stream
router.get("/stats/:streamId", async (req, res) => {
  try {
    const { streamId } = req.params;

    if (!mongoose.isValidObjectId(streamId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid streamId",
      });
    }

    const sid = new mongoose.Types.ObjectId(streamId);

    const stats = await Reaction.aggregate([
      { $match: { streamId: sid } },
      { $group: { _id: "$emoji", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    const total = stats.reduce((sum, item) => sum + item.count, 0);

    return res.json({
      success: true,
      total,
      reactions: stats.map((s) => ({
        emoji: s._id,
        count: s.count,
        percentage: total > 0 ? ((s.count / total) * 100).toFixed(1) : "0.0",
      })),
    });
  } catch (error) {
    console.error("Error fetching reaction stats:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch reaction statistics",
    });
  }
});

// Get recent reactions for a stream
router.get("/recent/:streamId", async (req, res) => {
  try {
    const { streamId } = req.params;
    const limit = Number.parseInt(String(req.query.limit ?? "50"), 10) || 50;

    if (!mongoose.isValidObjectId(streamId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid streamId",
      });
    }

    const sid = new mongoose.Types.ObjectId(streamId);

    const reactions = await Reaction.find({ streamId: sid })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("userId", "username displayName avatar")
      .lean();

    return res.json({ success: true, reactions });
  } catch (error) {
    console.error("Error fetching recent reactions:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch recent reactions",
    });
  }
});

export default router;