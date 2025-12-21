import ChatMessage from "../models/Message.js";
import Stream from "../models/Stream.js";
import Reaction from "../models/Reaction.js";

const activeRooms = new Map(); // roomName -> Set of socket.id
const userSockets = new Map(); // socket.id -> user info

export const initSocketService = (io) => {
  io.on("connection", (socket) => {
    console.log("🔌 User connected:", socket.id);

    // Join stream room
    socket.on("join-stream", async ({ roomName, username, userId }) => {
      try {
        // Clean up any previous rooms this socket was in
        const previousUserInfo = userSockets.get(socket.id);
        if (previousUserInfo && previousUserInfo.roomName !== roomName) {
          await handleLeaveRoom(socket, previousUserInfo.roomName, io);
        }

        // Check if user is already in this room with a different socket
        const viewers = activeRooms.get(roomName);
        if (viewers) {
          const existingSocket = Array.from(viewers).find((id) => {
            const info = userSockets.get(id);
            return (
              info?.username === username &&
              info?.userId === userId &&
              id !== socket.id
            );
          });

          if (existingSocket) {
            console.log(
              `⚠️ ${username} already in ${roomName} with socket ${existingSocket}, removing old socket`
            );
            const oldSocket = io.sockets.sockets.get(existingSocket);
            if (oldSocket) {
              oldSocket.leave(roomName);
            }
            activeRooms.get(roomName).delete(existingSocket);
            userSockets.delete(existingSocket);
          }
        }

        socket.join(roomName);
        userSockets.set(socket.id, { roomName, username, userId });
        if (!activeRooms.has(roomName)) activeRooms.set(roomName, new Set());
        activeRooms.get(roomName).add(socket.id);

        const viewerCount = activeRooms.get(roomName).size;

        await Stream.findOneAndUpdate(
          { roomName, isLive: true },
          { currentViewers: viewerCount, $max: { peakViewers: viewerCount } }
        );

        io.to(roomName).emit("viewer-count", { count: viewerCount });
        io.to(roomName).emit("system-message", {
          message: `${username} joined the stream`,
          timestamp: new Date(),
        });
        console.log(
          `👤 ${username} joined ${roomName} (${viewerCount} viewers)`
        );
      } catch (error) {
        console.error("Error joining stream:", error);
      }
    });

    // Leave stream room
    socket.on("leave-stream", async ({ roomName }) => {
      await handleLeaveRoom(socket, roomName, io);
    });

    // Send chat message
    socket.on(
      "chat-message",
      async ({ roomName, message, username, userId, streamId }) => {
        console.log("💬 Chat message received:", {
          roomName,
          message,
          username,
          userId,
          streamId,
        });

        try {
          if (!userId || !streamId) {
            console.warn(`⚠️ Anonymous message in ${roomName}: "${message}"`);
            io.to(roomName).emit("chat-message", {
              username,
              message,
              timestamp: new Date(),
            });
            return;
          }

          if (!streamId.match(/^[0-9a-fA-F]{24}$/)) {
            console.error(`❌ Invalid streamId format: ${streamId}`);
            io.to(roomName).emit("chat-message", {
              username,
              message,
              timestamp: new Date(),
            });
            return;
          }

          const chatMessage = await ChatMessage.create({
            streamId: streamId,
            userId: userId,
            username,
            message,
          });

          io.to(roomName).emit("chat-message", {
            id: chatMessage._id,
            username,
            userId,
            message,
            timestamp: chatMessage.timestamp,
          });

          console.log(`💬 ${username}: ${message}`);
        } catch (error) {
          console.error("❌ Error sending message:", error.message);
          io.to(roomName).emit("chat-message", {
            username,
            message,
            timestamp: new Date(),
          });
        }
      }
    );

    // Send reaction - IMPROVED VERSION
    socket.on("send-reaction", async ({ roomName, emoji, username }) => {
      try {
        const userInfo = userSockets.get(socket.id);
        const userId = userInfo?.userId;

        // Generate random position for animation
        const position = {
          x: Math.random() * 80 + 10, // 10-90% from left
          delay: Math.random() * 500, // 0-500ms delay
        };

        const reactionData = {
          emoji,
          username,
          x: position.x,
          delay: position.delay,
          id: `${socket.id}-${Date.now()}`,
        };

        // Broadcast to all viewers immediately
        io.to(roomName).emit("new-reaction", reactionData);

        // Try to save to database (optional - don't block if it fails)
        try {
          // Find the stream by roomName
          const stream = await Stream.findOne({ roomName, isLive: true });

          if (stream && userId) {
            await Reaction.create({
              streamId: stream._id,
              userId: userId,
              username,
              emoji,
            });
            console.log(
              `${emoji} Saved reaction from ${username} in ${roomName}`
            );
          }
        } catch (dbError) {
          console.warn("⚠️ Failed to save reaction to DB:", dbError.message);
          // Don't throw - reaction was already broadcast
        }

        console.log(`${emoji} ${username} reacted in ${roomName}`);
      } catch (error) {
        console.error("❌ Error handling reaction:", error);
      }
    });

    // Stream status updates
    socket.on("stream-status", async ({ roomName, status }) => {
      io.to(roomName).emit("stream-status", { status });
    });

    // Typing indicator
    socket.on("typing-start", ({ roomName, username }) => {
      socket.to(roomName).emit("user-typing", { username, isTyping: true });
    });

    socket.on("typing-stop", ({ roomName, username }) => {
      socket.to(roomName).emit("user-typing", { username, isTyping: false });
    });

    // Disconnect
    socket.on("disconnect", async () => {
      const userInfo = userSockets.get(socket.id);
      if (userInfo) {
        await handleLeaveRoom(socket, userInfo.roomName, io);
        userSockets.delete(socket.id);
      }
      console.log("🔌 User disconnected:", socket.id);
    });
  });
};

// Helper function to handle leaving room
async function handleLeaveRoom(socket, roomName, io) {
  if (!roomName) return;

  socket.leave(roomName);

  const userInfo = userSockets.get(socket.id);

  if (activeRooms.has(roomName)) {
    activeRooms.get(roomName).delete(socket.id);
    const viewerCount = activeRooms.get(roomName).size;

    await Stream.findOneAndUpdate(
      { roomName, isLive: true },
      { currentViewers: viewerCount }
    );

    io.to(roomName).emit("viewer-count", { count: viewerCount });

    if (userInfo?.username) {
      io.to(roomName).emit("system-message", {
        message: `${userInfo.username} left the stream`,
        timestamp: new Date(),
      });
    }

    if (viewerCount === 0) {
      activeRooms.delete(roomName);
    }

    console.log(`👤 User left ${roomName} (${viewerCount} viewers remaining)`);
  }
}
