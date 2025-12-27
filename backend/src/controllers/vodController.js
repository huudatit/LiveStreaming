import VOD from "../models/VOD.js";
import Streaming from "../models/Stream.js";
import User from "../models/User.js";
import {
  EgressClient,
  EncodedFileType,
  EncodedFileOutput,
  S3Upload,
} from "livekit-server-sdk";
import { livekitConfig } from "../config/livekit.js";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from "crypto";

const egressClient = new EgressClient(
  livekitConfig.url,
  livekitConfig.apiKey,
  livekitConfig.apiSecret
);

/**
 * POST /api/vod/start
 * Start recording a live stream
 * @access Private (Streamer only)
 */
export const startRecording = async (req, res) => {
  try {
    const { streamId, roomName } = req.body;
    const key = roomName || streamId;
    const user = req.user;

    // Find stream
    const stream = await Streaming.findOne({ roomName: key });

    if (!stream) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy stream" });
    }

    // Check ownership
    if (stream.streamerId.toString() !== user._id.toString()) {
      return res
        .status(403)
        .json({
          success: false,
          message: "Bạn không có quyền quay stream này",
        });
    }

    // Check if stream is live (Có thể comment dòng này nếu muốn test khi chưa live)
    if (stream.status !== "live") {
      // return res.status(400).json({ success: false, message: "Stream không đang live" });
    }

    // Check existing VOD
    const existingVod = await VOD.findOne({
      streamId: stream.roomName,
      status: "RECORDING",
    });

    if (existingVod) {
      return res.status(409).json({
        success: false,
        message: "Stream đang có bản ghi (recording/processing)",
        vod: existingVod,
      });
    }

    // Generate filename
    const vodId = `vod_${stream.roomName}_${crypto
      .randomBytes(4)
      .toString("hex")}`;

    // 1. Cấu hình Output (Chỉ cần khai báo ở đây)

    const safeRoom = String(stream.roomName).replace(/[^a-zA-Z0-9_-]/g, "_");
    const filename = `${safeRoom}-${Date.now()}.mp4`;

    const fileOutput = new EncodedFileOutput({
      fileType: EncodedFileType.MP4,
      filepath: `vod/${filename}`,
      output: {
        case: "s3",
        value: new S3Upload({
          accessKey: process.env.S3_ACCESS_KEY,
          secret: process.env.S3_SECRET_KEY,
          bucket: process.env.S3_BUCKET,
          region: process.env.S3_REGION || "auto",

          // Nếu dùng R2/MinIO:
          endpoint: process.env.S3_ENDPOINT, // ví dụ: https://<account>.r2.cloudflarestorage.com
          forcePathStyle: true,
        }),
      },
    });

    console.log(`🎥 Requesting Egress for room: ${stream.roomName}`);

    // 2. Gọi lệnh Ghi hình (Đã sửa)
    const egress = await egressClient.startRoomCompositeEgress(
      stream.roomName, // Tham số 1: Tên phòng
      fileOutput, // Tham số 2: Đầu ra file (đã khai báo ở trên)
      {
        // Tham số 3: Tùy chọn (Options)
        layout: "grid", // Chọn bố cục: "grid", "speaker", "single-speaker"
        audioOnly: false,
        videoOnly: false,
        // ❌ ĐÃ XÓA key 'file' ở đây vì nó thừa và gây lỗi
      }
    );

    // Create VOD record
    const vod = await VOD.create({
      vodId,
      streamId: stream.roomName,
      title: stream.title,
      thumbnail: stream.thumbnail ?? null,
      streamerId: stream.streamerId,
      streamerUsername: stream?.username || "unknown",
      streamerDisplayName: stream?.displayName,
      streamerAvatar: stream?.avatar ?? null,
      egressId: egress.egressId,
      status: "RECORDING",
    });

    return res.status(201).json({
      success: true,
      message: "Bắt đầu quay stream",
      vod: {
        vodId: vod.vodId,
        streamId: vod.streamId,
        egressId: vod.egressId,
        status: vod.status,
      },
    });
  } catch (error) {
    console.error("Start recording error:", error);
    return res.status(500).json({
      success: false,
      message: "Không thể bắt đầu quay",
      error: error.message,
    });
  }
};

/**
 * POST /api/vod/stop
 * Stop recording a live stream
 * @access Private (Streamer only)
 */
export const stopRecording = async (req, res) => {
  try {
    const { vodId } = req.body;
    const user = req.user;

    // Find VOD
    const vod = await VOD.findOne({ vodId });

    if (!vod) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy VOD",
      });
    }

    // Check ownership
    if (vod.streamerId.toString() !== user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền dừng recording này",
      });
    }

    // Check if already stopped
    if (vod.status !== "RECORDING") {
      return res.status(400).json({
        success: false,
        message: "Recording đã dừng rồi",
      });
    }

    // Stop LiveKit Egress
    if (vod.egressId) {
      try {
        await egressClient.stopEgress(vod.egressId);
      } catch (egressError) {
        console.warn("Failed to stop egress:", egressError);
        // Continue anyway
      }
    }

    // Note: The actual file URL will be updated via webhook
    // For now, mark as PROCESSING and wait for webhook
    vod.status = "PROCESSING";
    await vod.save();

    return res.status(200).json({
      success: true,
      message: "Đã dừng recording, đang xử lý video",
      vod: {
        vodId: vod.vodId,
        status: vod.status,
      },
    });
  } catch (error) {
    console.error("Stop recording error:", error);
    return res.status(500).json({
      success: false,
      message: "Không thể dừng recording",
      error: error.message,
    });
  }
};

/**
 * POST /api/vod/webhook
 * Webhook endpoint for LiveKit Egress completion
 * @access Public (but should be secured with webhook secret)
 */
export const egressWebhook = async (req, res) => {
  try {
    const { event, egressInfo } = req.body;

    if (event === "egress_ended") {
      const { egressId, fileResults, roomName } = egressInfo;

      // Find VOD by egressId
      const vod = await VOD.findOne({ egressId });

      if (vod) {
        if (fileResults && fileResults.length > 0) {
          // Update VOD with file info
          const file = fileResults[0];
          vod.vodLink = file.downloadUrl || file.location;
          vod.fileSize = file.size || 0;
          vod.duration = file.duration || 0;
          vod.status = "READY";
        } else {
          vod.status = "FAILED";
        }

        await vod.save();
      }
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Egress webhook error:", error);
    return res.status(500).json({
      success: false,
      message: "Webhook processing failed",
    });
  }
};

/**
 * GET /api/vod/:vodId
 * Get VOD details
 * @access Public
 */
export const getVOD = async (req, res) => {
  try {
    const { vodId } = req.params;

    const vod = await VOD.findOne({ vodId }).populate(
      "streamerId",
      "username displayName avatar"
    );

    if (!vod) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy VOD",
      });
    }

    // Increment view count
    if (vod.status === "READY" || vod.status === "PROCESSING") {
      vod.views += 1;
      await vod.save();
    }

    const playbackUrl = await toPlaybackUrl(vod.vodLink);

    return res.status(200).json({
      success: true,
      vod: {
        vodId: vod.vodId,
        streamId: vod.streamId,
        title: vod.title,
        thumbnail: vod.thumbnail,
        streamer: {
          username: vod.streamerId.username,
          displayName: vod.streamerId.displayName,
          avatar: vod.streamerId.avatar,
        },
        views: vod.views,
        vodLink: vod.vodLink,
        status: vod.status,
        duration: vod.duration,
        recordedAt: vod.recordedAt,
        playbackUrl
      },
    });
  } catch (error) {
    console.error("Get VOD error:", error);
    return res.status(500).json({
      success: false,
      message: "Không thể lấy thông tin VOD",
      error: error.message,
    });
  }
};

/**
 * GET /api/vod/list
 * List VODs
 * @access Public
 */
export const listVODs = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const sort = req.query.sort || "latest"; // latest, popular
    const streamerId = req.query.streamerId;

    const skip = (page - 1) * limit;

    // Build query
    const query = { status: { $in: ["READY", "PROCESSING"] } };
    if (streamerId) {
      query.streamerId = streamerId;
    }

    // Build sort
    let sortQuery = { createdAt: -1 }; // latest
    if (sort === "popular") {
      sortQuery = { views: -1 };
    }

    const vods = await VOD.find(query)
      .sort(sortQuery)
      .skip(skip)
      .limit(limit)
      .populate("streamerId", "username displayName avatar")
      .lean();

    const total = await VOD.countDocuments(query);

    return res.status(200).json({
      success: true,
      vods: vods.map((v) => ({
        vodId: v.vodId,
        title: v.title,
        thumbnail: v.thumbnail,
        streamer: {
          username: v.streamerId.username,
          displayName: v.streamerId.displayName,
          avatar: v.streamerId.avatar,
        },
        views: v.views,
        duration: v.duration,
        recordedAt: v.recordedAt,
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("List VODs error:", error);
    return res.status(500).json({
      success: false,
      message: "Không thể lấy danh sách VOD",
      error: error.message,
    });
  }
};

/**
 * DELETE /api/vod/:vodId
 * Delete a VOD
 * @access Private (Streamer only)
 */
export const deleteVOD = async (req, res) => {
  try {
    const { vodId } = req.params;
    const user = req.user;

    const vod = await VOD.findOne({ vodId });

    if (!vod) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy VOD",
      });
    }

    // Check ownership
    if (vod.streamerId.toString() !== user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền xóa VOD này",
      });
    }

    // Delete VOD record
    // Note: You should also delete the actual file from storage
    await VOD.deleteOne({ vodId });

    return res.status(200).json({
      success: true,
      message: "Đã xóa VOD",
    });
  } catch (error) {
    console.error("Delete VOD error:", error);
    return res.status(500).json({
      success: false,
      message: "Không thể xóa VOD",
      error: error.message,
    });
  }
};

const s3 = new S3Client({
  region: process.env.S3_REGION || "auto",
  endpoint: process.env.S3_ENDPOINT, // R2/MinIO thì có
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY,
    secretAccessKey: process.env.S3_SECRET_KEY,
  },
  forcePathStyle: true, // nếu bạn đang dùng R2/MinIO
});

function parseS3Location(loc) {
  // loc: s3://bucket/vod/xxx.mp4
  const m = /^s3:\/\/([^/]+)\/(.+)$/.exec(loc || "");
  if (!m) return null;
  return { bucket: m[1], key: m[2] };
}

async function toPlaybackUrl(vodLink) {
  if (!vodLink) return null;
  if (vodLink.startsWith("http://") || vodLink.startsWith("https://"))
    return vodLink;

  const parsed = parseS3Location(vodLink);
  if (!parsed) return null;

  const cmd = new GetObjectCommand({ Bucket: parsed.bucket, Key: parsed.key });
  return getSignedUrl(s3, cmd, { expiresIn: 60 * 30 }); // 30 phút
}