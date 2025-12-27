import {
  autoStartRecording,
  autoStopRecording,
} from "../services/vodAutoService.js";
import Stream from "../models/Stream.js";
import User from "../models/User.js";
import VOD from "../models/VOD.js";

const toBigInt = (v) => {
  if (v === undefined || v === null) return null;
  if (typeof v === "bigint") return v;
  if (typeof v === "number") return BigInt(Math.trunc(v));
  if (typeof v === "string") {
    try {
      return BigInt(v);
    } catch {
      return null;
    }
  }
  return null;
};

const nsToSeconds = (ns) => Number(ns) / 1e9;

export async function handleLivekitWebhook(req, res) {
  try {
    const event = req.livekitEvent; 
    console.log("📡 LiveKit Webhook event:", event.event);

    const roomName = event.room?.name || event.ingressInfo?.roomName;

    if (event.event === "track_published" && roomName) {
      const participant = event.participant;
      const track = event.track;
      
      // Only trigger on video track from host (not viewers)
      if (track?.type === "video") {
        console.log(`🎥 Video track published in room: ${roomName}`);
        
        const stream = await Stream.findOne({ roomName });
        if (stream && !stream.isLive) {
          stream.isLive = true;
          stream.status = "live";
          stream.startedAt = new Date();
          await stream.save();
          console.log(`✅ Stream ${roomName} auto-set to LIVE`);

          const existingVod = await VOD.findOne({
            streamId: roomName,
            status: "PROCESSING",
          });
          if (!existingVod) {
            console.log("🎥 Auto-starting recording for WebRTC stream");
            await autoStartRecording(roomName);
          }

          // Emit socket event to notify frontend
          const io = req.app.get("io");
          if (io) {
            io.to(roomName).emit("stream-status", { status: "live", isLive: true });
          }
        }
      }
    }

    // Auto-start recording on ingress
    if (event.event === "ingress_started" && roomName) {
      console.log(`OBS started in room: ${roomName}`);
      
      // Set stream to LIVE
      const stream = await Stream.findOne({ roomName });
      if (stream && !stream.isLive) {
        stream.isLive = true;
        stream.status = "live";
        stream.startedAt = new Date();
        await stream.save();
        console.log(`✅ Stream ${roomName} auto-set to LIVE (via ingress)`);
        
        // Emit socket event to notify frontend
        const streamer = await User.findById(stream.streamerId).populate("followers");
    
        if (streamer && streamer.followers.length > 0) {
          const io = req.app.get("io"); // Lấy instance Socket.IO
            
          // 2. Gửi thông báo đến từng follower
          streamer.followers.forEach(follower => {
            // Giả sử mỗi user join room socket bằng userId của họ khi login
            // room socket: `user_${follower._id}`
            io.to(`user_${follower._id}`).emit("notification", {
              type: "STREAM_STARTED",
              message: `${streamer.displayName} đang phát trực tiếp!`,
              streamId: stream._id,
              roomName: stream.roomName,
              avatar: streamer.avatar
            });
          });
          console.log(`🔔 Sent notifications to ${streamer.followers.length} followers`);
        }
      }
      await autoStartRecording(roomName);
    }

    // Auto-stop recording on ingress end
    if (event.event === "ingress_ended" && roomName) {
      console.log(`🛑 Ingress ended in room: ${roomName}`);
      
      // Set stream to ENDED
      const stream = await Stream.findOne({ roomName });
      if (stream && stream.isLive) {
        stream.isLive = false;
        stream.status = "ended";
        stream.endedAt = new Date();
        await stream.save();
        console.log(`✅ Stream ${roomName} auto-set to ENDED (via ingress)`);
        
        // Emit socket event to notify frontend
        const io = req.app.get("io");
        if (io) {
          io.to(roomName).emit("stream-ended", { 
            message: "Stream đã kết thúc",
            streamId: stream._id 
          });
        }
      }
      
      await autoStopRecording(roomName);
    }

    // egress_ended: update READY + vodLink
    if (event.event === "egress_ended") {
      const egressId = event.egressInfo?.egressId;
      const file = event.egressInfo?.fileResults?.[0];

      const downloadUrl = file?.downloadUrl || file?.location;

      const vod = await VOD.findOne({ egressId });
      if (vod) {
        vod.vodLink = downloadUrl;
        if (!downloadUrl) {
          vod.status = "FAILED";
        } else {
          vod.status = "READY";
        }

        // 1) fileSize: ưu tiên field trong webhook (có thể là size/fileSize)
        const sizeRaw = file?.size ?? file?.fileSize ?? 0;
        vod.fileSize = typeof sizeRaw === "string" ? Number(sizeRaw) : Number(sizeRaw || 0);

        // 2) duration: ưu tiên duration nếu có, fallback = endedAt - startedAt (nanoseconds)
        let durationRaw = file?.duration ?? event.egressInfo?.duration ?? 0;
        let duration = typeof durationRaw === "string" ? Number(durationRaw) : Number(durationRaw || 0);

        if (!duration || duration === 0) {
          const startNs = toBigInt(file?.startedAt ?? event.egressInfo?.startedAt);
          const endNs = toBigInt(file?.endedAt ?? event.egressInfo?.endedAt);
          if (startNs && endNs && endNs > startNs) {
            duration = nsToSeconds(endNs - startNs);
          }
          if (duration > 1e7) duration /= 1e9;
        }

        vod.duration = Math.round(duration);

        // (tuỳ chọn) recordedAt: lấy theo endedAt nếu có
        // vod.recordedAt = new Date();

        await vod.save();

        // phần sync sang Stream bạn giữ nguyên
        const stream = await Stream.findOne({
          $or: [{ _id: vod.streamId }, { roomName: vod.streamId }],
        });

        if (stream) {
          stream.recordingUrl = downloadUrl;
          stream.recordingStatus = "ready";
          stream.status = "ended";
          await stream.save();
          console.log("✅ Synced VOD data to Stream model");
        }
      }
    }

    return res.json({ ok: true });
  } catch (e) {
    console.error(e);
    return res.status(200).json({ ok: true }); // tránh LiveKit retry liên tục
  }
}
