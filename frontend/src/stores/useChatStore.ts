import { create } from "zustand";
// import type { ChatMessage } from "@/types/message";

export type ChatMessage = {
  id: string;
  username: string;
  text: string;
  ts: number;
};

type ChatState = {
  messages: ChatMessage[];
  push: (m: ChatMessage) => void;
  clear: () => void;
};

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  push: (m) => set((s) => ({ messages: [...s.messages, m] })),
  clear: () => set({ messages: [] }),
}));