import { api } from "@/lib/axios";

export const streamService = {
  // Lấy danh sách tất cả các streams
  listLive: async () => {
    const res = await api.get("/stream/list");
    return res.data.streams || [];
  },

  // Lấy thông tin chi tiết của stream theo streamId
  getById: async (streamId: string) => {
    const res = await api.get(`/stream/${streamId}`);
    return res.data;
  },

  // Bắt đầu một live stream mới
  start: async (body: { title: string; description?: string; thumbnail?: string }) => {
    const res = await api.post("/stream/start", body);
    return res.data;
  },

  // Kết thúc stream
  end: async (streamId: string) => {
    const res = await api.post("/stream/end", { streamId });
    return res.data;
  },

  // Lấy LiveKit token cho streamer
  getPublisherToken: async (streamId: string) => {
    const res = await api.post(`/stream/${streamId}/token`, {
      role: "publisher"
    });
    return res.data.token;
  },

  // Lấy LiveKit token cho viewer
  getViewerToken: async (streamId: string, identify: string) => {
    const res = await api.post(`/stream/${streamId}/token`, {
      role: "viewer",
      identify
    });
    return res.data.token;
  }
};

export const vodService = {
  // Danh sách tất cả VODs
  list: async () => {
    const res = await api.get("/vod/list");
    return res.data.vods || [];
  },

  // Lấy VOD theo ID
  getById: async (vodId: string) => {
    const res = await api.get(`/vod/${vodId}`);
    return res.data.vod;
  },

  // Bắt đầu recording (egress)
  startRecording: async (streamId: string) => {
    const res = await api.post("/vod/start", { streamId });
    return res.data;
  }
};

export async function fetchLiveStreams() {
  return streamService.listLive();
}

export async function fetchVodStreams() {
  return vodService.list();
}

export async function fetchViewerToken(streamId: string, identify: string){
  try {
    const token = await streamService.getViewerToken(streamId, identify);
    return token;
  } catch (error) {
    console.error("fetchViewerToke error: ", error);
    throw error;
  }
}


// export async function fetchLiveStreams() {
//   const res = await api.get("/streams/live");
//   return res.data.items || [];
// }

// export async function fetchViewerToken(room: string, identity: string) {
//   try {
//     const res = await api.get("/livekit/viewer-token", {
//       params: { room, identity },
//     });

//     if (!res.data.success) {
//       throw new Error(res.data.message || "Failed to get viewer token");
//     }

//     return res.data.token;
//   } catch (error) {
//     console.error("fetchViewerToken error:", error);
//     throw error;
//   }
// }

// export async function fetchVodStreams() {
//   const res = await api.get("/streams/vod");
//   return res.data.items || [];
// }

