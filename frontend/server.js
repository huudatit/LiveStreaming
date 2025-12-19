import { Server } from "socket.io";
import { createServer } from "http";

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: { origin: "*" },
});

io.on("connection", (socket) => {
  console.log("✅ New client connected");
  socket.on("chatMessage", (msg) => {
    io.emit("chatMessage", msg);
  });
  socket.on("disconnect", () => console.log("❌ Client disconnected"));
});

httpServer.listen(5001, () =>
  console.log("⚡ Chat server running on port 3001")
);
