import type { User } from "./user";

export interface Stream {
  _id: string;
  streamId: string; // map LiveKit roomName sau nÃ y
  title: string;
  room: string;
  participants: number;
  metadata?: string | null;
  description?: string;
  streamer: User | string; // tuá»³ populate
  isLive: boolean;
  status: "preparing" | "live" | "ended";
  viewerCount: number;
  startedAt?: string;
  endedAt?: string;
  duration?: number;
  thumbnailUrl?: string;
  recordingUrl?: string;
}