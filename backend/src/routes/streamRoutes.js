import express from "express";
import {
  createStream,
  endStream,
  getStreamById,
  getLiveStreams,
  meLive,
  updateStream,
  getVodStreams,
} from "../controllers/streamController.js";
import { protectedRoute } from "../middleware/authMiddleware.js";

const router = express.Router();

// Tạo stream mới
router.post("/create", protectedRoute, createStream);

// Kết thúc stream
router.post("/:id/end", protectedRoute, endStream);

// Danh sách stream đang live
router.get("/live", getLiveStreams);

router.get("/me/live", protectedRoute, meLive);

// Xem chi tiết stream
router.get("/:id", getStreamById);

// Cập nhật thông tin stream
router.patch("/:id", protectedRoute, updateStream);

// debug
router.get("/room/:name/participants", async (req, res) => {
  try {
    const { name } = req.params;
    const ps = await roomService.listParticipants(name);
    res.json(
      ps.map((p) => ({
        identity: String(p.identity),
        name: p.name ?? null,
        tracks: p.tracks?.map((t) => ({ source: t.source, muted: t.muted })),
      }))
    );
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false });
  }
});

router.get("/vod", protectedRoute, getVodStreams);

export default router;
