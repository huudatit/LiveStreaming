import { api } from "@/lib/axios";
import type { Vod } from "@/types/vod";

export async function fetchLiveStreams() {
  const res = await api.get("/streams/live");
  return res.data.items || [];
}

export const fetchStreamDetail = async (roomId: string) => {
  // roomId có thể là ID hoặc roomName
  const response = await api.get(`/streams/${roomId}`);

  // QUAN TRỌNG: Trả về response.data.stream chứ không phải response.data
  if (response.data && response.data.success) {
    return response.data.stream;
  }
  throw new Error(response.data.message || "Failed to load stream");
};

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