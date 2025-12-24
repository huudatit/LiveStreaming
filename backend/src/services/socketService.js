import ChatMessage from "../models/Message.js";
import Stream from "../models/Stream.js";
import Reaction from "../models/Reaction.js";

const activeRooms = new Map(); // roomName -> Set of socket.id
const userSockets = new Map(); // socket.id -> user info

export const initSocketService = (io) => {
  global.io = io;

  io.on("connection", (socket) => {
    console.log("🔌 User connected:", socket.id);

    // Register for notifications (join user-specific room)
    socket.on("register-notifications", ({ userId }) => {
      if (userId) {
        const userRoom = `user_${userId}`;
        socket.join(userRoom);
        console.log(`📱 User ${userId} registered for notifications`);
      }
    });

    // Join stream room
    socket.on("join-stream", async ({ roomName, displayName, userId }) => {
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
              info?.displayName === displayName &&
              info?.userId === userId &&
              id !== socket.id
            );
          });

          if (existingSocket) {
            console.log(
              `⚠️ ${displayName} already in ${roomName} with socket ${existingSocket}, removing old socket`
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
        userSockets.set(socket.id, { roomName, displayName, userId });
        if (!activeRooms.has(roomName)) activeRooms.set(roomName, new Set());
        activeRooms.get(roomName).add(socket.id);

        const viewerCount = activeRooms.get(roomName).size;

        await Stream.findOneAndUpdate(
          { roomName, isLive: true },
          { currentViewers: viewerCount, $max: { peakViewers: viewerCount } }
        );

        io.to(roomName).emit("viewer-count", { count: viewerCount });
        // Commented out to prevent spam when page refreshes
        // io.to(roomName).emit("system-message", {
        //   message: `${displayName} joined the stream`,
        //   timestamp: new Date(),
        // });
        console.log(
          `👤 ${displayName} joined ${roomName} (${viewerCount} viewers)`
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
      async ({ roomName, message, displayName, userId, streamId }) => {
        console.log("💬 Chat message received:", {
          roomName,
          message,
          displayName,
          userId,
          streamId,
        });

        try {
          if (!userId || !streamId) {
            console.warn(`⚠️ Anonymous message in ${roomName}: "${message}"`);
            io.to(roomName).emit("chat-message", {
              displayName,
              message,
              timestamp: new Date(),
            });
            return;
          }

          if (!streamId.match(/^[0-9a-fA-F]{24}$/)) {
            console.error(`❌ Invalid streamId format: ${streamId}`);
            io.to(roomName).emit("chat-message", {
              displayName,
              message,
              timestamp: new Date(),
            });
            return;
          }

          const chatMessage = await ChatMessage.create({
            streamId: streamId,
            userId: userId,
            displayName,
            message,
          });

          io.to(roomName).emit("chat-message", {
            id: chatMessage._id,
            displayName,
            userId,
            message,
            timestamp: chatMessage.timestamp,
          });

          console.log(`💬 ${displayName}: ${message}`);
        } catch (error) {
          console.error("❌ Error sending message:", error.message);
          io.to(roomName).emit("chat-message", {
            displayName,
            message,
            timestamp: new Date(),
          });
        }
      }
    );

    // Send reaction - IMPROVED VERSION
    socket.on("send-reaction", async ({ roomName, emoji, displayName }) => {
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
          displayName,
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
              displayName,
              emoji,
            });
            console.log(
              `${emoji} Saved reaction from ${displayName} in ${roomName}`
            );

            // 🆕 Emit updated reaction stats to the room (for Dashboard)
            try {
              const stats = await Reaction.aggregate([
                { $match: { streamId: stream._id } },
                { $group: { _id: "$emoji", count: { $sum: 1 } } },
                { $sort: { count: -1 } },
              ]);

              const total = stats.reduce((sum, s) => sum + s.count, 0);
              const reactions = stats.map((s) => ({
                emoji: s._id,
                count: s.count,
                percentage: total > 0 ? ((s.count / total) * 100).toFixed(1) : "0",
              }));

              io.to(roomName).emit("reaction-stats-updated", {
                streamId: stream._id.toString(),
                reactions,
                total,
              });
              console.log(`📊 Emitted reaction stats update to ${roomName}`);
            } catch (statsError) {
              console.warn("⚠️ Failed to emit reaction stats:", statsError.message);
            }
          }
        } catch (dbError) {
          console.warn("⚠️ Failed to save reaction to DB:", dbError.message);
          // Don't throw - reaction was already broadcast
        }

        console.log(`${emoji} ${displayName} reacted in ${roomName}`);
      } catch (error) {
        console.error("❌ Error handling reaction:", error);
      }
    });

    // Stream status updates
    socket.on("stream-status", async ({ roomName, status }) => {
      io.to(roomName).emit("stream-status", { status });
    });

    // Typing indicator
    socket.on("typing-start", ({ roomName, displayName }) => {
      socket.to(roomName).emit("user-typing", { displayName, isTyping: true });
    });

    socket.on("typing-stop", ({ roomName, displayName }) => {
      socket.to(roomName).emit("user-typing", { displayName, isTyping: false });
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

    // Commented out to prevent spam when page refreshes
    // if (userInfo?.displayName) {
    //   io.to(roomName).emit("system-message", {
    //     message: `${userInfo.displayName} left the stream`,
    //     timestamp: new Date(),
    //   });
    // }

    if (viewerCount === 0) {
      activeRooms.delete(roomName);
    }

    console.log(`👤 User left ${roomName} (${viewerCount} viewers remaining)`);
  }
}