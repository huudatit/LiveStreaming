import { api } from "@/lib/axios";
import type { Stream } from "@/types/stream";
import type { Vod } from "@/types/vod";

export async function fetchLiveStreams() {
  const res = await api.get("/streams/live");
  return res.data.items || [];
}

export async function fetchStreamDetail(streamId: string): Promise<Stream> {
  const { data } = await api.get(`/streams/${streamId}`);
  return data.stream as Stream;
}

export async function fetchViewerToken(room: string, identity: string) {
  try {
    const res = await api.get("/livekit/viewer-token", {
      params: { room, identity },
    });

    if (!res.data.success) {
      throw new Error(res.data.message || "Failed to get viewer token");
    }

    return res.data.token;
  } catch (error) {
    console.error("fetchViewerToken error:", error);
    throw error;
  }
}

export async function fetchVods() {
  const res = await api.get("/vod/list");
  return (res.data.vods ?? []) as Vod[];
}

export async function fetchVodDetail(vodId: string) {
  const res = await api.get(`/vod/${vodId}`);
  return res.data.vod as Vod;
}