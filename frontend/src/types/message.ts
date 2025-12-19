export interface ChatMessage {
  _id: string;
  stream: string; // Stream ID
  user: string; // User ID
  username: string;
  message: string;
  timestamp: string; // ISO
};
