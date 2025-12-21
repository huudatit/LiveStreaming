import express from "express";
import { signUp, signIn, signOut, authMe, refreshToken } from "../controllers/authController.js";
import { protectedRoute } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/signup", signUp);
router.post("/signin", signIn);
router.post("/signout", signOut);
router.get("/me", protectedRoute, authMe);
router.post("/refresh", refreshToken);

export default router;
