// routes/livekitWebhookRoutes.js
import express from "express";
import { handleLivekitWebhook } from "../controllers/livekitWebhookController.js";
import { WebhookReceiver } from "livekit-server-sdk";

const router = express.Router();

// Middleware to parse and verify LiveKit webhook
const webhookMiddleware = (req, res, next) => {
  try {
    // Parse raw body as text
    const body = req.body;
    
    console.log("📨 Received webhook, body type:", typeof body);
    
    // If body is string (from express.text()), parse it
    if (typeof body === "string") {
      req.livekitEvent = JSON.parse(body);
    } else {
      // Already parsed as JSON
      req.livekitEvent = body;
    }
    
    console.log("✅ Parsed webhook event:", req.livekitEvent.event);
    next();
  } catch (error) {
    console.error("❌ Webhook parse error:", error);
    return res.status(400).json({ error: "Invalid webhook payload" });
  }
};

// Webhook endpoint - use express.json() instead of express.text()
router.post(
  "/webhook",
  express.json({ type: "*/*" }), // Accept any content-type as JSON
  webhookMiddleware,
  handleLivekitWebhook
);

export default router;
