import { create } from "zustand";

export type ReactionBurst = { id: string; emoji: string; x: number; y: number };

type ReactionState = {
  bursts: ReactionBurst[];
  add: (b: ReactionBurst) => void;
  remove: (id: string) => void;
};

export const useReactionStore = create<ReactionState>((set) => ({
  bursts: [],
  add: (b) => set((s) => ({ bursts: [...s.bursts, b] })),
  remove: (id) => set((s) => ({ bursts: s.bursts.filter((b) => b.id !== id) })),
}));
