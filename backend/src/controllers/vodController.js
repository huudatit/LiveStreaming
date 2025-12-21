import VOD from "../models/VOD.js";
import Streaming from "../models/Stream.js";
import User from "../models/User.js";
import { EgressClient, EncodedFileType } from "livekit-server-sdk";
import { livekitConfig } from "../config/livekit.js";
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
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy stream",
      });
    }

    // Check ownership
    if (stream.streamerId.toString() !== user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền quay stream này",
      });
    }

    // Check if stream is live
    if (stream.status !== "live") {
      return res.status(400).json({
        success: false,
        message: "Stream không đang live",
      });
    }

    // Check if VOD already exists for this stream
    const existingVod = await VOD.findOne({ streamId });
    if (existingVod) {
      return res.status(409).json({
        success: false,
        message: "Stream này đã được quay lại rồi",
        vod: existingVod,
      });
    }

    // Generate vodId and filename
    const vodId = `vod_${streamId}_${crypto.randomBytes(4).toString("hex")}`;
    const filename = `${vodId}.mp4`;

    // Start LiveKit Egress
    // NOTE: You need to configure S3/GCS storage in LiveKit Cloud Dashboard
    const egress = await egressClient.startRoomCompositeEgress(
      stream.roomName,
      {
        file: {
          filepath: filename,
          fileType: EncodedFileType.MP4,
        },
        // Optional: customize video settings
        videoOnly: false,
        audioOnly: false,
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
      status: "PROCESSING",
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
 * POST /api/vod/end
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
    if (vod.status !== "PROCESSING") {
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
    if (vod.status === "READY") {
      vod.views += 1;
      await vod.save();
    }

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
    const query = { status: "READY" };
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
