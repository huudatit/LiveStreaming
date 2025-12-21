// src/server.js
import dotenv from "dotenv";
import http from "http";
import { Server } from "socket.io";
import { connectDB } from "./config/database.js";
import { initSocketService } from "./services/socketService.js";
import app from "./app.js";

dotenv.config();

// Tạo HTTP server từ app
const server = http.createServer(app);

// Cấu hình Socket.IO
const io = new Server(server, {
  cors: {
    origin: [ process.env.CLIENT_URL || "http://localhost:5173" ],
    credentials: true,
  },
});

// Kết nối Database
connectDB();

// Khởi tạo socket service
initSocketService(io);

// Lắng nghe cổng
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Socket.IO ready for connections`);
});
