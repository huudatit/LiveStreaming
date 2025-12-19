import { io } from "socket.io-client";

export const socket = io(
  // import.meta.env.VITE_API_URL || "http://localhost:5000",
  "http://localhost:5000",
  {
    transports: ["websocket"],
    withCredentials: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 2000,
  }
);
