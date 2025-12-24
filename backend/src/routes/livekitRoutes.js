import express from "express";
import {
  getHostToken,
  createIngress,
  getViewerToken,
} from "../controllers/livekitController.js";
import { handleLivekitWebhook } from "../controllers/webhookController.js";

const router = express.Router();

router.post("/token", getHostToken);
router.post("/ingress", createIngress);
router.get("/viewer-token", getViewerToken); 

// LiveKit webhook endpoint
router.post("/webhook", handleLivekitWebhook);

export default router;
