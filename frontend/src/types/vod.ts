export type Vod = {
  vodId: string;
  title: string;
  thumbnail?: string | null;
  streamer: { username: string; displayName: string; avatar?: string | null };
  views: number;
  duration: number;
  recordedAt: string;
  vodLink?: string | null; // chỉ có khi gọi detail
  status?: "PROCESSING" | "READY" | "FAILED";
};
