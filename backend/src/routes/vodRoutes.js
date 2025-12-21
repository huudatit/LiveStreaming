import express from "express";
import {
  startRecording,
  stopRecording,
  egressWebhook,
  getVOD,
  listVODs,
  deleteVOD,
} from "../controllers/vodController.js";
import { protectedRoute } from "../middleware/authMiddleware.js";

const router = express.Router();

// Start recording a stream (Private - Streamer only)
router.post("/start", protectedRoute, startRecording);

// Stop recording a stream (Private - Streamer only)
router.post("/end", protectedRoute, stopRecording);

// Webhook endpoint for LiveKit Egress completion (Public but should be secured)
router.post("/webhook", egressWebhook);

// List VODs (Public)
router.get("/list", listVODs);

// Get VOD details (Public)
router.get("/:vodId", getVOD);

// Delete a VOD (Private - Streamer only)
router.delete("/:vodId", protectedRoute, deleteVOD);

export default router;
