import { io } from "socket.io-client";

// Nếu bạn có backend sau này thì đổi thành http://localhost:5000
export const socket = io("http://localhost:3001", {
  transports: ["websocket"],
});
