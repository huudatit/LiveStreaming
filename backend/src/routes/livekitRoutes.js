import express from "express";
import {
  getHostToken,
  createIngress,
  getViewerToken,
} from "../controllers/livekitController.js";

const router = express.Router();

router.post("/token", getHostToken);
router.post("/ingress", createIngress);
router.get("/viewer-token", getViewerToken); 

export default router;
