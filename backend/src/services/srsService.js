// backend/src/services/srsService.js
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const SRS_API_URL = process.env.SRS_API_URL || "http://localhost:1985";
const SRS_HTTP_SERVER = process.env.SRS_HTTP_SERVER || "http://localhost:8080";
const RTMP_URL = process.env.RTMP_URL || "rtmp://localhost:1935/live";
const SRS_WEBRTC_HOST = process.env.SRS_WEBRTC_HOST || "localhost";

class SRSService {
  constructor() {
    this.apiUrl = `${SRS_API_URL}/api/v1`;
    this.httpServer = SRS_HTTP_SERVER;
    this.rtmpUrl = RTMP_URL;
  }

  // Lấy thông tin tất cả streams
  async getAllStreams() {
    try {
      const response = await axios.get(`${this.apiUrl}/streams/`);
      return response.data.streams || [];
    } catch (error) {
      console.error("Get all streams error:", error.message);
      return [];
    }
  }

  // Lấy thông tin stream cụ thể
  async getStream(streamId) {
    try {
      const streams = await this.getAllStreams();

      // Tìm stream theo streamId
      const stream = streams.find((s) => {
        const streamName = s.name || s.stream;
        return streamName === streamId || streamName.endsWith(`/${streamId}`);
      });

      if (stream) {
        return {
          streamId: stream.name || stream.stream,
          app: stream.app,
          clients: stream.clients || 0,
          kbps: stream.kbps || 0,
          isLive: true,
        };
      }

      return null;
    } catch (error) {
      console.error("Get stream error:", error.message);
      return null;
    }
  }

  // Lấy số lượng người xem
  async getViewerCount(streamId) {
    try {
      const stream = await this.getStream(streamId);
      return stream?.clients || 0;
    } catch (error) {
      console.error("Get viewer count error:", error.message);
      return 0;
    }
  }

  // Check stream có đang live không
  async isStreamLive(streamId) {
    const stream = await this.getStream(streamId);
    return stream !== null && stream.isLive;
  }

  // Lấy RTMP URL để streamer push
  getRtmpUrl(streamKey) {
    return `${this.rtmpUrl}/${streamKey}`;
  }

  // Lấy RTMP Server (dùng cho OBS)
  getRtmpServer() {
    return this.rtmpUrl;
  }

  // Lấy HLS play URL
  getHlsPlayUrl(streamId) {
    return `${this.httpServer}/live/${streamId}.m3u8`;
  }

  // Lấy HTTP-FLV URL (low latency hơn HLS)
  getFlvPlayUrl(streamId) {
    return `${this.httpServer}/live/${streamId}.flv`;
  }

  // Lấy WebRTC play URL (lowest latency)
  getWebRtcPlayUrl(streamId) {
    return `webrtc://${SRS_WEBRTC_HOST}/live/${streamId}`;
  }

  // Lấy tất cả play URLs
  getPlayUrls(streamId) {
    return {
      hls: this.getHlsPlayUrl(streamId),
      flv: this.getFlvPlayUrl(streamId),
      webrtc: this.getWebRtcPlayUrl(streamId),
    };
  }

  // Lấy thông tin server
  async getServerInfo() {
    try {
      const response = await axios.get(`${this.apiUrl}/summaries/`);
      return response.data;
    } catch (error) {
      console.error("Get server info error:", error.message);
      throw error;
    }
  }

  // Lấy danh sách clients
  async getClients() {
    try {
      const response = await axios.get(`${this.apiUrl}/clients/`);
      return response.data.clients || [];
    } catch (error) {
      console.error("Get clients error:", error.message);
      return [];
    }
  }

  // Kick client (ngắt kết nối)
  async kickClient(clientId) {
    try {
      const response = await axios.delete(`${this.apiUrl}/clients/${clientId}`);
      return response.data;
    } catch (error) {
      console.error("Kick client error:", error.message);
      throw error;
    }
  }

  // SRS tự động ghi stream nếu config DVR, không cần method riêng
  // Nhưng có thể list recordings từ file system
  getRecordingPath(streamId) {
    // Theo config: ./objs/nginx/html/live/[stream].[timestamp].mp4
    return `/live/${streamId}`;
  }
}

export default new SRSService();
