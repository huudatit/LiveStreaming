import crypto from "crypto";
import Stream from "../models/Stream.js";
import User from "../models/User.js";
import { createRoom, deleteRoom } from "../services/livekitService.js";
import { RoomServiceClient } from "livekit-server-sdk";
import { livekitConfig } from "../config/livekit.js";
import mongoose from "mongoose";

const roomService = new RoomServiceClient(
  livekitConfig.url,
  livekitConfig.apiKey,
  livekitConfig.apiSecret
);

// POST /api/streams/create  (Private)
export const createStream = async (req, res) => {
  try {
    const { title, description = "" } = req.body;
    const userId = req.user._id;

    if (!title?.trim()) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Vui lòng nhập tiêu đề cho buổi stream",
        });
    }

    // (Tuỳ chọn) Chặn nếu user đang có stream live chưa kết thúc
    const existingLive = await Stream.findOne({
      streamerId: userId,
      isLive: true,
      status: "live",
    });
    if (existingLive) {
      return res.status(409).json({
        success: false,
        message:
          "Bạn đang có một buổi stream đang phát. Hãy kết thúc trước khi tạo buổi mới.",
        stream: existingLive,
      });
    }

    const user = await User.findById(userId).lean();
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy user" });
    }

    // Tạo roomName duy nhất (không tái sử dụng _id user)
    const roomName = `room_${userId.toString()}_${Date.now()}_${crypto
      .randomBytes(4)
      .toString("hex")}`;

    // Tạo phòng trên LiveKit
    await createRoom(roomName, { title, streamerId: userId.toString() });

    // Lưu vào Mongo
    const newStream = await Stream.create({
      roomName: roomName,
      title: title.trim(),
      description,
      streamerId: userId,
      username: user.username,
      displayName: user.displayName,
      isLive: true,
      status: "live",
      startedAt: new Date(),
      viewerCount: 0,
    });

    res
      .status(201)
      .json({
        success: true,
        message: "Buổi stream đã được tạo",
        stream: newStream,
      });
  } catch (error) {
    console.error("Lỗi khi tạo stream:", error);
    res
      .status(500)
      .json({
        success: false,
        message: error.message || "Không thể tạo buổi stream",
      });
  }
};

// GET /api/streams/live  (Public)
export const getLiveStreams = async (_req, res) => {
  try {
    // 1. Get all rooms from LiveKit
    const rooms = await roomService.listRooms({});
    const roomNames = rooms.map(r => String(r.name));

    console.log("📡 LiveKit rooms:", roomNames);

    // 2. Get streams from MongoDB that match LiveKit rooms
    const streams = await Stream.find({
      roomName: { $in: roomNames },
      isLive: true,
    })
      .populate("streamerId", "username displayName avatar avatarUrl _id")
      .lean();

    console.log("📊 DB streams:", streams.map(s => s.roomName));

    // 3. Enrich MongoDB data with LiveKit room data
    const items = streams.map((stream) => {
      const liveKitRoom = rooms.find(r => String(r.name) === stream.roomName);
      
      const participants =
        typeof liveKitRoom?.numParticipants === "bigint"
          ? Number(liveKitRoom.numParticipants)
          : liveKitRoom?.numParticipants ?? 0;

      const startedAtSec =
        typeof liveKitRoom?.creationTime === "bigint"
          ? Number(liveKitRoom.creationTime)
          : liveKitRoom?.creationTime ?? 0;

      return {
        _id: stream._id,
        streamId: stream._id.toString(),
        room: stream.roomName,
        title: stream.title,
        description: stream.description,
        streamer: stream.streamerId, // Already populated
        isLive: true,
        status: stream.status,
        viewerCount: participants,
        participants,
        startedAt: startedAtSec * 1000,
        thumbnailUrl: stream.thumbnailUrl,
      };
    });

    console.log("✅ Returning streams:", items.length);

    return res.json({ success: true, items });
  } catch (e) {
    console.error("getLiveStreams error:", e);
    return res
      .status(500)
      .json({ success: false, message: e?.message || "Cannot list rooms" });
  }
};

// GET /api/streams/me/live (Private)
export const meLive = async (req, res) => {
  try {
    const userIdStr = req.user?._id?.toString();
    if (!userIdStr) return res.status(401).json({ success: false });

    // 1) Lấy stream mới nhất của user từ DB
    const streamerId = new mongoose.Types.ObjectId(userIdStr);
    const stream = await Stream.findOne({ streamerId }).sort({ createdAt: -1 });

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
    
    console.log("🔍 getStreamById called with ID:", id);

    const isMongoId = /^[a-f\d]{24}$/i.test(id);
    const query = isMongoId ? { _id: id } : { roomName: id };
    
    console.log("📝 Query:", JSON.stringify(query), "isMongoId:", isMongoId);

    let stream = await Stream.findOne(query)
      .populate(
        "streamerId",
        "username displayName avatar avatarUrl followers _id"
      )
      .lean();
    
    console.log("📊 Stream found:", stream ? "YES" : "NO");
    if (stream) {
      console.log("  - roomName:", stream.roomName);
      console.log("  - title:", stream.title);
      console.log("  - streamerId populated:", !!stream.streamerId?.username);
    }

    if (!stream)
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy buổi stream" });
    
    // Check if streamerId is populated (has username field) or just an ObjectId
    let streamerData = stream.streamerId;
    
    // If streamerId doesn't have username, it's not populated - fetch manually
    if (!streamerData?.username) {
      console.log("⚠️ Streamer not populated, fetching manually...");
      streamerData = await User.findById(stream.streamerId).select('username displayName avatar avatarUrl followers _id').lean();
      console.log("✅ Streamer fetched:", streamerData?.username);
    }
    
    console.log("✅ Returning stream with streamer:", streamerData?.username);
    
    res.status(200).json({
      success: true,
      stream: {
        ...stream,
        streamer: streamerData, // Use fetched or populated streamer data
        room: stream.roomName,
      },
    });
  } catch (error) {
    console.error("Lỗi khi lấy thông tin stream:", error);
    res
      .status(500)
      .json({ success: false, message: "Không thể lấy thông tin buổi stream" });
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
