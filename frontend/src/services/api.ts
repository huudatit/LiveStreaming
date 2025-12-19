// src/services/api.ts
import { api } from "@/lib/axios.ts";
import type { Stream } from "@/types/stream";
import type { ChatMessage } from "@/types/message";

export const streamService = {
  listLive: () => api.get<Stream[]>("/api/streams?live=true"),
  getById: (id: string) => api.get<Stream>(`/api/streams/${id}`),
  create: (body: { title: string; description?: string }) =>
    api.post<Stream>("/api/streams", body),
  start: (id: string) => api.post(`/api/streams/${id}/start`, {}),
  end: (id: string) => api.post(`/api/streams/${id}/end`, {}),
};

export const chatService = {
  history: (streamId: string, cursor?: string) =>
    api.get<ChatMessage[]>(`/api/streams/${streamId}/chat`, {
      params: { cursor },
    }),
  send: (streamId: string, message: string) =>
    api.post(`/api/streams/${streamId}/chat`, { message }),
};
