import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/authRoutes.js";
import streamRoutes from "./routes/streamRoutes.js";
import { errorHandler, notFound } from "./middleware/errorHandler.js";

dotenv.config();

const app = express();

// Middleware
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Server is running",
    db: process.env.MONGODB_URI ? "connected" : "not connected",
  });
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/streams", streamRoutes);

// Error handlers
app.use(notFound);
app.use(errorHandler);

export default app;
