import Message from "../models/Message.js";
import { verifyToken } from "../utils/jwt.js";
import User from "../models/User.js";

export const setupChatHandlers = (io) => {
  // Middleware xác thực
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error("Authentication error"));
      }

      const decoded = verifyToken(token);
      const user = await User.findById(decoded.id);

      if (!user) {
        return next(new Error("User not found"));
      }

      socket.userId = user._id;
      socket.username = user.username;
      next();
    } catch (error) {
      next(new Error("Authentication error"));
    }
  });

  io.on("connection", (socket) => {
    console.log(`✅ User connected: ${socket.username}`);

    // Join stream room
    socket.on("join-stream", async (streamId) => {
      try {
        socket.join(streamId);
        socket.currentStream = streamId;

        console.log(`📺 ${socket.username} joined stream: ${streamId}`);

        // Gửi tin nhắn hệ thống
        io.to(streamId).emit("system-message", {
          message: `${socket.username} joined the stream`,
        });

        // Gửi lịch sử chat gần đây
        const messages = await Message.find({ streamId })
          .sort("-createdAt")
          .limit(50)
          .lean();

        socket.emit("chat-history", messages.reverse());

        // Cập nhật viewer count
        updateViewerCount(io, streamId);
      } catch (error) {
        console.error("Join stream error:", error);
        socket.emit("error", { message: "Failed to join stream" });
      }
    });

    // Leave stream room
    socket.on("leave-stream", (streamId) => {
      socket.leave(streamId);
      console.log(`👋 ${socket.username} left stream: ${streamId}`);

      io.to(streamId).emit("system-message", {
        message: `${socket.username} left the stream`,
      });

      updateViewerCount(io, streamId);
    });

    // Send chat message
    socket.on("chat-message", async (data) => {
      try {
        const { streamId, message } = data;

        // Validate message
        if (!message || message.trim().length === 0) {
          return;
        }

        if (message.length > 500) {
          return socket.emit("error", {
            message: "Message too long (max 500 characters)",
          });
        }

        // Save message to database
        const newMessage = await Message.create({
          streamId,
          user: socket.userId,
          username: socket.username,
          message: message.trim(),
        });

        // Broadcast to all users in stream
        io.to(streamId).emit("chat-message", {
          id: newMessage._id,
          username: socket.username,
          message: newMessage.message,
          createdAt: newMessage.createdAt,
        });
      } catch (error) {
        console.error("Chat message error:", error);
        socket.emit("error", { message: "Failed to send message" });
      }
    });

    // Disconnect
    socket.on("disconnect", () => {
      console.log(`❌ User disconnected: ${socket.username}`);

      if (socket.currentStream) {
        updateViewerCount(io, socket.currentStream);
      }
    });
  });
};

// Helper function để đếm viewers
const updateViewerCount = async (io, streamId) => {
  const sockets = await io.in(streamId).fetchSockets();
  const viewerCount = sockets.length;

  io.to(streamId).emit("viewer-count", { count: viewerCount });

  console.log(`👥 Stream ${streamId}: ${viewerCount} viewers`);
};
