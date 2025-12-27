// backend/src/controllers/streamController.js

import crypto from "crypto";
import Stream from "../models/Stream.js";
import User from "../models/User.js";
import { createRoom, deleteRoom } from "../services/livekitService.js";
import {
  RoomServiceClient,
  IngressClient,
  IngressInput,
  IngressVideoEncodingPreset,
  IngressAudioEncodingPreset,
  TrackSource,
} from "livekit-server-sdk"; // <-- Import thêm Ingress
import { livekitConfig } from "../config/livekit.js";
import mongoose from "mongoose";

// Khởi tạo Ingress Client
const ingressClient = new IngressClient(
  livekitConfig.url,
  livekitConfig.apiKey,
  livekitConfig.apiSecret
);

const roomService = new RoomServiceClient(
  livekitConfig.url,
  livekitConfig.apiKey,
  livekitConfig.apiSecret
);

export const createStream = async (req, res) => {
  try {
    const { title, description = "" } = req.body;
    const userId = req.user._id;

    if (!title?.trim()) {
      return res.status(400).json({ success: false, message: "Thiếu tiêu đề" });
    }

    const user = await User.findById(userId).lean();
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    // 1. Tạo Room Name
    const roomName = `room_${userId}_${Date.now()}`;

    // 2. Tạo Room trên LiveKit
    await createRoom(roomName, { title, streamerId: userId.toString() });

    // 3. [MỚI] Tạo Ingress (RTMP) để lấy Server URL và Stream Key cho OBS
    const ingress = await ingressClient.createIngress(IngressInput.RTMP_INPUT, {
      name: roomName,
      roomName: roomName,
      participantName: user.displayName,
      participantIdentity: userId.toString(),
      // Tùy chọn: Cấu hình preset encoding (để giảm tải hoặc tăng chất lượng)
      video: {
        source: 1, // CAMERA
        preset: IngressVideoEncodingPreset.H264_1080P_30FPS_3_LAYERS,
      },
      audio: {
        source: 1, // MICROPHONE
        preset: IngressAudioEncodingPreset.OPUS_STEREO_96KBPS,
      },
    });

    // 4. Lưu vào Mongo (Kèm thông tin Ingress)
    const newStream = await Stream.create({
      roomName: roomName,
      title: title.trim(),
      description,
      streamerId: userId,
      username: user.username,
      displayName: user.displayName,
      isLive: false, 
      status: "preparing", // Trạng thái chờ

      // Lưu thông tin kết nối OBS
      ingressId: ingress.ingressId,
      serverUrl: ingress.url, // rtmp://...
      streamKey: ingress.streamKey, // khoá bí mật
    });

    res.status(201).json({
      success: true,
      message: "Tạo stream thành công",
      stream: newStream, // Frontend sẽ nhận được serverUrl và streamKey ở đây
    });
  } catch (error) {
    console.error("Create stream error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/streams/live  (Public)
export const getLiveStreams = async (_req, res) => {
  try {
    // 1. Lấy tất cả stream đang live
    const streams = await Stream.find({ isLive: true })
      .populate(
        "streamerId",
        "username displayName avatar avatarUrl _id followers"
      )
      .sort({ createdAt: -1 })
      .lean();

    // 2. Lọc và Format
    const items = streams.reduce((acc, stream) => {
      // KIỂM TRA QUAN TRỌNG: Nếu không tìm thấy streamer (null/undefined) -> Bỏ qua stream này
      if (!stream.streamerId) {
        return acc;
      }

      const streamer = stream.streamerId;

      acc.push({
        _id: stream._id,
        streamId: stream._id.toString(),
        room: stream.roomName,
        title: stream.title,
        description: stream.description,
        thumbnailUrl: stream.thumbnailUrl,
        isLive: true,
        viewerCount: stream.viewerCount || 0,
        startedAt: stream.startedAt,
        streamer: {
          _id: streamer._id,
          username: streamer.username,
          displayName: streamer.displayName,
          avatar: streamer.avatar || streamer.avatarUrl,
          followersCount: streamer.followers ? streamer.followers.length : 0,
        },
      });
      return acc;
    }, []);

    return res.json({ success: true, items });
  } catch (e) {
    console.error("getLiveStreams error:", e);
    return res
      .status(500)
      .json({ success: false, message: "Lỗi lấy danh sách stream" });
  }
};

// GET /api/streams/me/live (Private)
export const meLive = async (req, res) => {
  try {
    const userIdStr = req.user?._id?.toString();
    if (!userIdStr) return res.status(401).json({ success: false });

    // 1) Lấy stream mới nhất của user từ DB
    const streamerId = new mongoose.Types.ObjectId(userIdStr);
    const stream = await Stream.findOne({ streamerId, status: { $in: ["preparing", "live"] } }).sort({ createdAt: -1 });

    if (!stream) {
      return res.json({ success: true, live: false });
    }

    // 2) (Tuỳ chọn) check live thật bằng LiveKit rooms (theo roomName = userId)
    let live = false;
    try {
      const rooms = await roomService.listRooms({ names: [stream.roomName] });
      live = rooms.length > 0;
    } catch {
      // nếu LiveKit timeout, vẫn trả theo DB để UI không chết
      live = Boolean(stream.isLive) || stream.status === "live";
    }

    // 3) Trả streamId đúng để frontend gọi GET /api/streams/:id
    return res.json({
      success: true,
      live,
      streamId: stream._id.toString(),
      roomName: stream.roomName,
      isLive: stream.isLive,
      status: stream.status,
    });
  } catch (e) {
    console.error("meLive error:", e);
    return res.status(500).json({
      success: false,
      message: e?.message || "meLive error",
    });
  }
};

// GET /api/streams/:id  (Public)
// Hỗ trợ cả Mongo _id (24 hex) và streamId (roomName)
export const getStreamById = async (req, res) => {
  try {
    const { id } = req.params;

    const or = [{ roomName: id }];
    if (mongoose.isValidObjectId(id)) or.unshift({ _id: id });

    const stream = await Stream.findOne({ $or: or })
      .populate(
        "streamerId",
        "username displayName avatar avatarUrl followers _id"
      )
      .lean();

    if (!stream) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy buổi stream",
      });
    }

    const streamer = stream.streamerId;

    const streamOut = {
      ...stream,
      room: stream.roomName,
      streamer: streamer
        ? {
            _id: streamer._id,
            username: streamer.username,
            displayName: streamer.displayName,
            avatar: streamer.avatar || streamer.avatarUrl,
            followersCount: streamer.followers ? streamer.followers.length : 0,
          }
        : null,
    };

    delete streamOut.streamerId;

    return res.status(200).json({ success: true, stream: streamOut });
  } catch (error) {
    console.error("Lỗi khi lấy thông tin stream:", error);
    return res.status(500).json({
      success: false,
      message: "Không thể lấy thông tin buổi stream",
    });
  }
};


// POST /api/streams/:id/start 
export const startStreamManual = async (req, res) => {
  try {
    const { id } = req.params; // id này là streamId hoặc roomName
    const userId = req.user._id;

    // Tìm stream của user này
    const stream = await Stream.findOne({ 
      $or: [{ _id: id }, { roomName: id }],
      streamerId: userId 
    });

    if (!stream) {
      return res.status(404).json({ success: false, message: "Không tìm thấy stream" });
    }

    // Cưỡng chế cập nhật trạng thái thành LIVE
    stream.isLive = true;
    stream.status = "live";
    stream.startedAt = new Date();
    await stream.save();

    console.log(`✅ Manually started stream: ${stream.roomName}`);

    res.json({
      success: true,
      message: "Đã chuyển trạng thái sang ĐANG PHÁT (LIVE)",
      stream
    });
  } catch (error) {
    console.error("Manual start error:", error);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

// POST /api/streams/:id/end  (Private)
// Hỗ trợ kết thúc theo Mongo _id hoặc streamId
export const endStream = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const isMongoId = /^[a-f\d]{24}$/i.test(id);
    const query = isMongoId ? { _id: id } : { roomName: id };

    const stream = await Stream.findOne(query);

    if (!stream)
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy buổi stream",
      });

    // Kiểm tra ownership
    if (stream.streamerId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền kết thúc stream này",
      });
    }

    if (!stream.isLive || stream.status === "ended") {
      return res.json({
        success: true,
        message: "Buổi stream đã kết thúc trước đó",
      });
    }

    // Update stream status
    stream.isLive = false;
    stream.status = "ended";
    stream.endedAt = new Date();
    await stream.save();

    // Xóa Ingress trên LiveKit (để ngắt kết nối RTMP từ OBS)
    if (stream.ingressId) {
      try {
        const { IngressClient } = await import("livekit-server-sdk");
        const ingressClient = new IngressClient(
          livekitConfig.url,
          livekitConfig.apiKey,
          livekitConfig.apiSecret
        );
        await ingressClient.deleteIngress(stream.ingressId);
        console.log(`✅ Deleted LiveKit ingress: ${stream.ingressId}`);
      } catch (error) {
        console.warn(`⚠️ Failed to delete LiveKit ingress: ${error.message}`);
      }
    }

    // Xóa room trên LiveKit
    try {
      await deleteRoom(stream.roomName);
      console.log(`✅ Deleted LiveKit room: ${stream.roomName}`);
    } catch (error) {
      console.warn(`⚠️ Failed to delete LiveKit room: ${error.message}`);
    }

    // 🔥 Emit socket event để notify viewers
    const io = req.app.get("io");
    if (io) {
      io.to(stream.roomName).emit("stream-ended", {
        message: "Stream đã kết thúc",
        streamId: stream._id,
      });
    }

    res.json({
      success: true,
      message: "Buổi stream đã kết thúc thành công",
    });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ success: false, message: "Không thể kết thúc stream" });
  }
};

// PATCH /api/streams/:id  (Private)
export const updateStream = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, thumbnailUrl } = req.body;

    const isMongoId = /^[a-f\d]{24}$/i.test(id);
    // Sửa: Dùng roomName thay vì streamId
    const filter = isMongoId ? { _id: id } : { roomName: id };

    const stream = await Stream.findOneAndUpdate(
      filter,
      {
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(thumbnailUrl && { thumbnailUrl }),
      },
      { new: true }
    );

    if (!stream)
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy stream" });

    // Gửi tín hiệu real-time tới Viewer
    const io = req.app.get("io");
    if (io) {
      io.to(stream.roomName).emit("stream-updated", {
        title: stream.title,
        description: stream.description,
      });
    }

    res.status(200).json({ success: true, stream });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/streams/vod (Private)
export const getVodStreams = async (req, res) => {
  try {
    const userId = req.user._id;
    const vods = await Stream.find({
      streamerId: userId,
      status: "ended",
      recordingStatus: "ready",
    }).sort({ endedAt: -1 });

    res.json({ success: true, items: vods });
  } catch (e) {
    res
      .status(500)
      .json({ success: false, message: "Không thể lấy danh sách VOD" });
  }
};
