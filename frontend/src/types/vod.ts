export type Vod = {
  createdAt?: string | null;
  vodId: string;
  title: string;
  thumbnail?: string | null;
  streamer: { username: string; displayName: string; avatar?: string | null };
  views: number;
  duration: number;
  recordedAt: string;
  vodLink?: string | null; 
  status?: "RECORDING" | "PROCESSING" | "READY" | "FAILED";
};
