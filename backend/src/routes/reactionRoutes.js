import express from "express";
import Reaction from "../models/Reaction.js";
import Stream from "../models/Stream.js";

const router = express.Router();

// Get reaction statistics for a stream
router.get("/stats/:streamId", async (req, res) => {
  try {
    const { streamId } = req.params;

    // Aggregate reactions by emoji
    const stats = await Reaction.aggregate([
      {
        $match: { streamId: mongoose.Types.ObjectId(streamId) },
      },
      {
        $group: {
          _id: "$emoji",
          count: { $sum: 1 },
        },
      },
      {
        $sort: { count: -1 },
      },
    ]);

    const total = stats.reduce((sum, item) => sum + item.count, 0);

    res.json({
      success: true,
      total,
      reactions: stats.map((s) => ({
        emoji: s._id,
        count: s.count,
        percentage: total > 0 ? ((s.count / total) * 100).toFixed(1) : 0,
      })),
    });
  } catch (error) {
    console.error("Error fetching reaction stats:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch reaction statistics",
    });
  }
});

// Get recent reactions for a stream
router.get("/recent/:streamId", async (req, res) => {
  try {
    const { streamId } = req.params;
    const limit = parseInt(req.query.limit) || 50;

    const reactions = await Reaction.find({ streamId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("userId", "username displayName avatar")
      .lean();

    res.json({
      success: true,
      reactions,
    });
  } catch (error) {
    console.error("Error fetching recent reactions:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch recent reactions",
    });
  }
});

export default router;
