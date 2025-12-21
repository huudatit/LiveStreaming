// src/app.js
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { errorHandler } from "./middleware/errorMiddleware.js";
import authRoutes from "./routes/authRoutes.js";
import streamRoutes from "./routes/streamRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import livekitRoutes from "./routes/livekitRoutes.js";
import reactionRoutes from "./routes/reactionRoutes.js";
import swaggerUi from "swagger-ui-express";
import fs from "fs";
import path from "path";

const app = express();

const swaggerPath = path.join(process.cwd(), "src", "swagger.json");
const swaggerDocument = JSON.parse(fs.readFileSync(swaggerPath, "utf-8"));

// Middleware
app.use(
  cors({
    origin: ["http://localhost:5173"],
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

// Swagger UI route
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Health check route
app.get("/health", (req, res) => {
  res.json({ status: "ok", message: "Server is running" });
});

// Public routes
app.use("/api/auth", authRoutes);
app.use("/api/streams", streamRoutes);
app.use("/api/livekit", livekitRoutes);
app.use("/api/reactions", reactionRoutes);

// Private routes
app.use("/api/users", userRoutes);

// Error handling middleware
app.use(errorHandler);

export default app;
