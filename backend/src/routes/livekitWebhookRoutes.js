// routes/livekitWebhookRoutes.js
import express from "express";
import { handleLivekitWebhook } from "../controllers/livekitWebhookController.js";

const router = express.Router();

// đọc raw text để verify chính xác
router.post("/webhook", express.text({ type: "*/*" }), handleLivekitWebhook);

export default router;
