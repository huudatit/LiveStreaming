import app from "./app.js";
import { createServer } from "http";
import { Server } from "socket.io";
import { setupChatHandlers } from "./socket/chatHandler.js";
import { connectDatabase } from "./config/database.js";

const PORT = process.env.PORT || 5000;

// Create HTTP server
const httpServer = createServer(app);

// Setup Socket.IO
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true
  }
});

// Setup chat handlers
setupChatHandlers(io);

// Connect database
connectDatabase();

// Start server
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (err) => {
  console.log(`Error: ${err.message}`);
  server.close(() => process.exit(1));
});
