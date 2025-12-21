import {
  IngressClient,
  IngressInput,
  IngressAudioEncodingPreset,
  IngressVideoEncodingPreset,
  RoomServiceClient,
  TrackSource,
  AccessToken,
} from "livekit-server-sdk";
import { livekitConfig } from "../config/livekit.js";
import Stream from "../models/Stream.js";
import User from "../models/User.js";

const roomService = new RoomServiceClient(
  livekitConfig.url,
  livekitConfig.apiKey,
  livekitConfig.apiSecret
);

const ingressClient = new IngressClient(
  livekitConfig.url,
  livekitConfig.apiKey,
  livekitConfig.apiSecret
);

/**
 * Xóa TẤT CẢ ingress trên account (không chỉ per room)
 * Vì LiveKit có giới hạn tổng số ingress cho account
 */
async function resetAllIngresses() {
  const MAX_RETRIES = 5;
  const INITIAL_WAIT = 500;

  // Bước 1: Lấy TẤT CẢ ingress (không filter roomName)
  const list = await ingressClient.listIngress();

  if (list.length === 0) {
    console.log("✅ No ingress to delete");
    return;
  }

  console.log(`🗑 Found ${list.length} ingress(es) to delete across all rooms`);

  // Xóa tất cả
  for (const ig of list) {
    try {
      console.log(
        "🗑 Deleting ingress:",
        ig.ingressId,
        "from room:",
        ig.roomName
      );
      await ingressClient.deleteIngress(ig.ingressId);
    } catch (e) {
      console.warn("⚠ delete failed:", e?.message || e);
    }
  }

  // Bước 2: Verify tất cả ingress đã bị xóa
  let attempt = 0;
  while (attempt < MAX_RETRIES) {
    const waitTime = INITIAL_WAIT * Math.pow(1.5, attempt);
    console.log(
      `⏳ Waiting ${waitTime}ms before verification (attempt ${
        attempt + 1
      }/${MAX_RETRIES})...`
    );
    await new Promise((r) => setTimeout(r, waitTime));

    try {
      const remainingList = await ingressClient.listIngress();

      if (remainingList.length === 0) {
        console.log("✅ All ingresses verified as deleted");
        return;
      }

      console.log(
        `⚠ Still ${remainingList.length} ingress(es) remaining, retrying...`
      );

      // Thử xóa lại những cái còn sót
      for (const ig of remainingList) {
        try {
          console.log("🔄 Retry deleting:", ig.ingressId);
          await ingressClient.deleteIngress(ig.ingressId);
        } catch (e) {
          console.warn("⚠ retry delete failed:", e?.message);
        }
      }

      attempt++;
    } catch (e) {
      console.warn("⚠ verification check failed:", e?.message);
      attempt++;
    }
  }

  // Nếu sau MAX_RETRIES vẫn còn ingress, throw error
  const finalCheck = await ingressClient.listIngress();
  if (finalCheck.length > 0) {
    throw new Error(
      `Không thể xóa hết ingress. Còn ${finalCheck.length} ingress: ${finalCheck
        .map((i) => i.ingressId)
        .join(", ")}`
    );
  }
}

/**
 * POST /api/livekit/ingress
 * Body: { "userId": "abc123", "type": "RTMP_INPUT" | "WHIP_INPUT" }
 */
export const createIngress = async (req, res) => {
  try {
    console.log("📩 req.body:", req.body);
    const { userId, type, roomName } = req.body;

    if (!userId)
      return res.status(400).json({ success: false, message: "Thiếu userId" });

    const user = await User.findById(userId);
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy user" });

    // Xóa TẤT CẢ ingress cũ trên account
    await resetAllIngresses();

    const inputType =
      type === "WHIP_INPUT" ? IngressInput.WHIP_INPUT : IngressInput.RTMP_INPUT;

    console.log("🔄 Creating new ingress...");
    const ingress = await ingressClient.createIngress(inputType, {
      name: user.username,
      roomName: String(roomName || userId),
      participantIdentity: String(userId),
      participantName: user.displayName,
      audio: { preset: IngressAudioEncodingPreset.OPUS_STEREO_96K },
      video: { preset: IngressVideoEncodingPreset.H264_1080P_30FPS_3_LAYERS },
    });

    if (!ingress?.url || !ingress?.streamKey)
      throw new Error("Không thể tạo ingress!");

    console.log("✅ Ingress created successfully:", ingress.ingressId);

    // Lưu vào MongoDB
    let stream = await Stream.findOne({ streamerId: userId });
    if (!stream) {
      stream = new Stream({
        roomName: userId.toString(),
        title: `${user.displayName}'s Stream`,
        streamerId: userId,
        isLive: false,
        status: "preparing",
      });
    }

    stream.ingressId = ingress.ingressId;
    stream.streamKey = ingress.streamKey || "";
    stream.serverUrl = ingress.url;
    await stream.save();

    return res.status(201).json({
      success: true,
      message: "Ingress created successfully",
      ingress: {
        ingressId: ingress.ingressId,
        streamUrl: ingress.url,
        streamKey: ingress.streamKey,
        roomName: userId,
        participant: user.username,
      },
    });
  } catch (err) {
    console.error("❌ Ingress creation error:", err);

    let message = "Lỗi khi tạo ingress";
    if (err.code === "resource_exhausted") {
      message =
        "Vui lòng đợi một chút và thử lại. Hệ thống đang xử lý yêu cầu trước đó.";
    }

    res.status(err.status || 500).json({
      success: false,
      message: err.message || message,
      code: err.code,
    });
  }
};

export const getViewerToken = async (req, res) => {
  try {
    const { room, identity } = req.query;
    if (!room)
      return res.status(400).json({ success: false, message: "Missing room" });

    const at = new AccessToken(livekitConfig.apiKey, livekitConfig.apiSecret, {
      identity: identity || `viewer_${Date.now()}`,
    });
    at.addGrant({
      room,
      roomJoin: true,
      canSubscribe: true,
      canPublish: false,
      canPublishData: false,
    });

    const token = await at.toJwt();
    res.json({ success: true, token });
  } catch (e) {
    console.error("viewer-token error:", e);
    res.status(500).json({ success: false, message: "Token error" });
  }
};

/**
 * GET /api/livekit/ingress/list (DEBUG)
 * Endpoint để kiểm tra tất cả ingress đang tồn tại
 */
export const listAllIngresses = async (req, res) => {
  try {
    const list = await ingressClient.listIngress();
    res.json({
      success: true,
      count: list.length,
      ingresses: list.map((ig) => ({
        ingressId: ig.ingressId,
        roomName: ig.roomName,
        name: ig.name,
        streamKey: ig.streamKey,
        url: ig.url,
      })),
    });
  } catch (e) {
    console.error("listAllIngresses error:", e);
    res.status(500).json({ success: false, message: e.message });
  }
};

/**
 * DELETE /api/livekit/ingress/cleanup (DEBUG)
 * Endpoint để xóa sạch tất cả ingress
 */
export const cleanupAllIngresses = async (req, res) => {
  try {
    await resetAllIngresses();
    res.json({ success: true, message: "All ingresses deleted" });
  } catch (e) {
    console.error("cleanupAllIngresses error:", e);
    res.status(500).json({ success: false, message: e.message });
  }
};

export const getHostToken = async (req, res) => {
  try {
    const { roomName, username, role } = req.body;

    console.log("🔑 getHostToken called:", { roomName, username, role });

    if (!roomName || !username) {
      return res.status(400).json({
        success: false,
        message: "Missing roomName or username",
      });
    }

    const at = new AccessToken(livekitConfig.apiKey, livekitConfig.apiSecret, {
      identity: username,
      name: username,
      ttl: "2h",
    });

    // Host có quyền publish video/audio
    at.addGrant({
      room: roomName,
      roomJoin: true,
      canSubscribe: true,
      canPublish: true, // ✅ Cho phép phát
      canPublishData: true, // ✅ Cho phép gửi data
    });

    const token = await at.toJwt();

    console.log("✅ Host token generated for room:", roomName);

    res.json({
      success: true,
      token,
    });
  } catch (e) {
    console.error("❌ getHostToken error:", e);
    res.status(500).json({
      success: false,
      message: e.message || "Token generation failed",
    });
  }
};
