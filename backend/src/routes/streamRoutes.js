import express from "express";
import {
  startStream,
  stopStream,
  getStream,
  getLiveStreams,
  getServerStatus,
} from "../controllers/streamController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/server/status", getServerStatus);
router.post("/start", protect, startStream);
router.post("/:streamId/stop", protect, stopStream);
router.get("/live", getLiveStreams);
router.get("/:streamId", getStream);

export default router;
