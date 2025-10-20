import express from "express";
import { signUp, signIn, signOut, getMe } from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/signup", signUp);
router.post("/signin", signIn);
router.post("/signout", protect, signOut);
router.get("/me", protect, getMe);

export default router;
