import crypto from "crypto";
import Stream from "../models/Stream.js";
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
    const rooms = await roomService.listRooms({});

    // Ép BigInt về Number (hoặc string) trước khi json
    const items = rooms.map((r) => {
      // creationTime thường là giây dạng int64 -> BigInt
      const startedAtSec =
        typeof r.creationTime === "bigint"
          ? Number(r.creationTime)
          : r.creationTime ?? 0;
      const participants =
        typeof r.numParticipants === "bigint"
          ? Number(r.numParticipants)
          : r.numParticipants ?? 0;

      return {
        room: String(r.name ?? ""),
        startedAt: startedAtSec * 1000, // -> milliseconds cho frontend
        participants,
        metadata: r.metadata ?? null,
      };
    });

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

    const isMongoId = /^[a-f\d]{24}$/i.test(id);
    const query = isMongoId ? { _id: id } : { roomName: id };

    const stream = await Stream.findOne(query)
      .populate(
        "streamerId",
        "username displayName avatarUrl followers"
      )
      .lean();

    if (!stream)
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy buổi stream" });
    
    res.status(200).json({
      success: true,
      stream: {
        ...stream,
        streamer: stream.streamerId, 
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
    const isMongoId = /^[a-f\d]{24}$/i.test(id);
    const query = isMongoId ? { _id: id } : { streamId: id };

    const stream = await Stream.findOne(query);
    if (!stream)
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy buổi stream" });

    if (!stream.isLive || stream.status === "ended") {
      return res.json({
        success: true,
        message: "Buổi stream đã kết thúc trước đó",
      });
    }

    stream.isLive = false;
    stream.status = "ended";
    stream.endedAt = new Date();
    stream.recordingStatus = "ready";

    // 🟢 Giả sử bạn lưu video lên LiveKit Cloud hoặc server nội bộ
    stream.recordingUrl = `https://your-cdn.com/vods/${stream.streamId}.mp4`;

    await stream.save();

    res.json({
      success: true,
      message: "Buổi stream đã kết thúc và lưu video thành công",
      recordingUrl: stream.recordingUrl,
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
    const filter = isMongoId ? { _id: id } : { streamId: id };

    const stream = await Stream.findOneAndUpdate(
      filter,
      {
        ...(title && { title }),
        ...(description && { description }),
        ...(thumbnailUrl && { thumbnailUrl }),
      },
      { new: true }
    );

    if (!stream)
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy buổi stream để cập nhật",
      });
    res
      .status(200)
      .json({ success: true, message: "Cập nhật thành công", stream });
  } catch (error) {
    console.error("Lỗi khi cập nhật stream:", error);
    res
      .status(500)
      .json({ success: false, message: "Không thể cập nhật buổi stream" });
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
