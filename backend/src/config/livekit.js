// src/config/livekit.js
export const livekitConfig = {
  // URL cho Room/Ingress service (HTTP(S) của LiveKit server hoặc Cloud)
  url: process.env.LIVEKIT_API_URL, 
  apiKey: process.env.LIVEKIT_API_KEY,
  apiSecret: process.env.LIVEKIT_API_SECRET,

  // Dùng để hiển thị trường "Server URL" trên UI khi tạo RTMP
  // (Ingress trả về streamKey, còn server URL bạn có thể cố định: rtmps://<tenant>.rtmp.livekit.cloud/app)
  rtmpServerUrl: process.env.LIVEKIT_RTMP_URL, // ví dụ: rtmps://your-tenant.rtmp.livekit.cloud/app
};
