import express from "express";
import { protectedRoute } from "../middleware/authMiddleware.js";
import {
  getUserProfile,
  followUser,
  updateUserProfile,
  checkIsFollowing,
  getFollowingChannels,
} from "../controllers/userController.js";

const router = express.Router();

// Get following channels (Private) - Đặt trước /:username
router.get("/following/channels", protectedRoute, getFollowingChannels);

// Get user profile by username (Public)
router.get("/:username", getUserProfile);

// Follow/Unfollow user (Private)
router.post("/:userId/follow", protectedRoute, followUser);

// Check if following (Private)
router.get("/:userId/is-following", protectedRoute, checkIsFollowing);

// Update user profile (Private)
router.patch("/profile", protectedRoute, updateUserProfile);

export default router;