import {
  autoStartRecording,
  autoStopRecording,
} from "../services/vodAutoService.js";
import Stream from "../models/Stream.js";
import VOD from "../models/VOD.js";

export async function handleLivekitWebhook(req, res) {
  try {
    // bạn đã verify và decode event rồi thì event nằm ở đây
    const event = req.livekitEvent; // hoặc event bạn parse được

    console.log("📡 LiveKit Webhook event:", event.event);

    const roomName = event.room?.name || event.ingressInfo?.roomName;

    // 🔥 Auto-set stream to LIVE when streamer publishes video track
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
      console.log(`🎥 Ingress started in room: ${roomName}`);
      
      // Set stream to LIVE
      const stream = await Stream.findOne({ roomName });
      if (stream && !stream.isLive) {
        stream.isLive = true;
        stream.status = "live";
        stream.startedAt = new Date();
        await stream.save();
        console.log(`✅ Stream ${roomName} auto-set to LIVE (via ingress)`);
        
        // Emit socket event to notify frontend
        const io = req.app.get("io");
        if (io) {
          io.to(roomName).emit("stream-status", { status: "live", isLive: true });
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
      const vod = await VOD.findOne({ egressId });
      if (vod) {
        const file = event.egressInfo?.fileResults?.[0];
        vod.vodLink = file?.downloadUrl || file?.location || vod.vodLink;
        vod.status = "READY";
        vod.recordedAt = new Date();
        await vod.save();
      }
    }

    return res.json({ ok: true });
  } catch (e) {
    console.error(e);
    return res.status(200).json({ ok: true }); // tránh LiveKit retry liên tục
  }
}
