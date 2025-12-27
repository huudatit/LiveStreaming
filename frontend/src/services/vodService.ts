// src/services/vodService.ts
import { api } from "@/lib/axios";
import type { Vod } from "@/types/vod";

type ListVodsParams = {
  page?: number;
  limit?: number;
  sort?: "latest" | "popular";
  streamerId?: string;
};

export async function fetchVods(params: ListVodsParams = {}): Promise<Vod[]> {
  const { page = 1, limit = 20, sort = "latest", streamerId } = params;

  const { data } = await api.get("/vod/list", {
    params: { page, limit, sort, streamerId },
  });

  if (!data?.success) return [];
  return data.vods || [];
}

export async function fetchVodById(vodId: string) {
  const { data } = await api.get(`/vod/${vodId}`);
  if (!data?.success) throw new Error(data?.message || "Fetch VOD failed");
  return data.vod; // có vodLink + status...
}
