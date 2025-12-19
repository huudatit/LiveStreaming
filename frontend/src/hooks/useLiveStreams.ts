// src/hooks/useLiveStreams.ts
import { useEffect, useState } from "react";
import { fetchLiveStreams } from "@/services/streamService";
import type { Stream } from "@/types/stream";

export function useLiveStreams(pollMs = 5000) {
  const [items, setItems] = useState<Stream[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const res = await fetchLiveStreams();
      setItems(res);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const id = setInterval(load, pollMs);
    return () => clearInterval(id);
  }, [pollMs]);

  return { items, loading, reload: load };
}
