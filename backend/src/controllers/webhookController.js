import { WebhookReceiver } from "livekit-server-sdk";
import Stream from "../models/Stream.js";
import { livekitConfig } from "../config/livekit.js";

const webhookReceiver = new WebhookReceiver(
  livekitConfig.apiKey,
  livekitConfig.apiSecret
);

// POST /api/livekit/webhook
export const handleLivekitWebhook = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const body = req.body;

    // Verify webhook signature
    const event = webhookReceiver.receive(JSON.stringify(body), authHeader);
    
    console.log("📡 LiveKit Webhook:", event.event, event);

    // Handle different event types
    switch (event.event) {
      case "ingress_started":
        await handleIngressStarted(event);
        break;

      case "room_finished":
        await handleRoomFinished(event);
        break;

      case "participant_left":
        await handleParticipantLeft(event);
        break;

      case "ingress_ended":
        await handleIngressEnded(event);
        break;

      default:
        console.log(`ℹ️  Unhandled event: ${event.event}`);
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("❌ Webhook error:", error);
    res.status(400).json({ success: false, message: error.message });
  }
};

async function handleIngressStarted(event) {
  try {
    const ingressId = event.ingressInfo?.ingressId;
    const roomName = event.ingressInfo?.roomName || event.room?.name;
    if (!ingressId && !roomName) return;

    const stream = await Stream.findOne(
      ingressId ? { ingressId } : { roomName }
    );

    if (!stream) return;

    // Update stream -> LIVE
    stream.isLive = true;
    stream.status = "live";
    if (!stream.startedAt) stream.startedAt = new Date();
    await stream.save();

    // Update user -> LIVE (để Subscriptions có badge)
    await User.updateOne(
      { _id: stream.streamerId },
      { $set: { isLive: true } }
    );

    // Notify followers
    const io = global.io; // bạn set global.io trong initSocketService :contentReference[oaicite:5]{index=5}
    if (!io) return;

    const streamer = await User.findById(stream.streamerId)
      .select("followers username displayName avatar")
      .lean();

    const payload = {
      streamerId: streamer?._id?.toString(),
      username: streamer?.username,
      displayName: streamer?.displayName,
      avatar: streamer?.avatar,
      streamId: stream._id.toString(),
      roomName: stream.roomName,
      title: stream.title,
    };

    for (const fid of streamer?.followers || []) {
      io.to(`user_${fid.toString()}`).emit("followed-stream-live", payload);
    }

    console.log("🔔 Notified followers: streamer is LIVE", payload);
  } catch (e) {
    console.error("handleIngressStarted error:", e);
  }
}


// Handle room finished event
async function handleRoomFinished(event) {
  try {
    const roomName = event.room?.name;
    if (!roomName) return;

    console.log(`🏁 Room finished: ${roomName}`);

    const stream = await Stream.findOne({ roomName });
    if (!stream) {
      console.log(`⚠️  Stream not found for room: ${roomName}`);
      return;
    }

    if (stream.status === "ended") {
      console.log(`ℹ️  Stream already ended: ${roomName}`);
      return;
    }

    // Update stream status
    stream.isLive = false;
    stream.status = "ended";
    stream.endedAt = new Date();
    await stream.save();
    await User.updateOne(
      { _id: stream.streamerId },
      { $set: { isLive: false } }
    );


    console.log(`✅ Stream ended in DB: ${stream.title}`);
  } catch (error) {
    console.error("Error handling room_finished:", error);
  }
}

// Handle participant left event
async function handleParticipantLeft(event) {
  try {
    const roomName = event.room?.name;
    const participant = event.participant;

    // Check if it's the host/streamer leaving
    if (participant?.identity && participant.identity.includes("host_")) {
      console.log(`👋 Host left room: ${roomName}`);
      
      // Give 30 seconds grace period before ending stream
      setTimeout(async () => {
        const stream = await Stream.findOne({ roomName, isLive: true });
        if (stream) {
          // Check if host reconnected
          const stillLive = await checkIfRoomStillActive(roomName);
          if (!stillLive) {
            stream.isLive = false;
            stream.status = "ended";
            stream.endedAt = new Date();
            await stream.save();
            console.log(`✅ Stream auto-ended after host disconnect: ${stream.title}`);
          }
        }
      }, 30000); // 30 second grace period
    }
  } catch (error) {
    console.error("Error handling participant_left:", error);
  }
}

// Handle ingress ended event (OBS disconnected)
async function handleIngressEnded(event) {
  try {
    const ingressId = event.ingressInfo?.ingressId;
    if (!ingressId) return;

    console.log(`🎥 Ingress ended: ${ingressId}`);

    const stream = await Stream.findOne({ ingressId });
    if (!stream) {
      console.log(`⚠️  Stream not found for ingress: ${ingressId}`);
      return;
    }

    if (stream.status === "ended") {
      console.log(`ℹ️  Stream already ended`);
      return;
    }

    // Update stream status
    stream.isLive = false;
    stream.status = "ended";
    stream.endedAt = new Date();
    await stream.save();

    console.log(`✅ Stream ended (OBS disconnected): ${stream.title}`);
    await User.updateOne(
      { _id: stream.streamerId },
      { $set: { isLive: false } }
    );

    // Notify viewers via Socket.IO
    const io = global.io;
    if (io) {
      io.to(stream.roomName).emit("stream-ended", {
        message: "Streamer đã ngắt kết nối",
        streamId: stream._id,
      });
    }
  } catch (error) {
    console.error("Error handling ingress_ended:", error);
  }
}

// Helper: Check if room still has active participants
async function checkIfRoomStillActive(roomName) {
  try {
    const { RoomServiceClient } = await import("livekit-server-sdk");
    const roomService = new RoomServiceClient(
      livekitConfig.url,
      livekitConfig.apiKey,
      livekitConfig.apiSecret
    );

    const rooms = await roomService.listRooms({ names: [roomName] });
    return rooms.length > 0;
  } catch {
    return false;
  }
}
