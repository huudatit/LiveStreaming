// src/types/stream.ts
import type { User } from "./user";

export type StreamStatus = "LIVE" | "ENDED" | "PREPARING";

export interface Stream {
  _id: string;
  streamId: string;
  title: string;
  description?: string;
  thumbnail?: string;

  // Thông tin của Streamer 
  streamerId?: string;
  streamerUsername?: string;
  streamerAvatar?: string;
  streamer?: User | string;

  // Status and metadata
  status: StreamStatus;
  roomName: string;
  views: number;

  // Timestamps
  startedAt?: string;
  endedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface VOD {
  _id: string;
  vodId: string;
  streamId: string;
  title: string;
  thumbnail?: string;

  // Thông tin của Streamer
  streamerId?: string;
  streamerUsername?: string;
  streamerAvatar?: string;

  // VOD specific
  vodLink: string;
  views: number;
  duration?: number;
  egressId?: string;

  // Timestamps
  createdAt?: string;
}

export interface StreamResponse {
  success: boolean;
  stream: Stream;
  token?: string;
  message?: string;
}

export interface VODResponse {
  success: boolean;
  vod: VOD;
  message?: string;
}
