import { EgressClient, EncodedFileOutput } from "livekit-server-sdk";
import Stream from "../models/Stream.js";
import VOD from "../models/VOD.js";
import User from "../models/User.js";

const host = process.env.LIVEKIT_API_URL; // https://xxx.livekit.cloud
const apiKey = process.env.LIVEKIT_API_KEY;
const apiSecret = process.env.LIVEKIT_API_SECRET;

export const egressClient = new EgressClient(host, apiKey, apiSecret);

export const autoStartRecording = async (roomName) => {
  try {
    // Check xem stream này đang được ghi chưa (dựa vào DB hoặc logic cache)
    const stream = await Stream.findOne({ roomName });
    if (stream?.recordingStatus === "recording") {
      console.log("⚠️ Recording already in progress for:", roomName);
      return;
    }

    // Cấu hình output ra file MP4
    const fileOutput = new EncodedFileOutput({
      fileType: EncodedFileType.MP4,
      filepath: `recordings/${roomName}-${Date.now()}.mp4`, // Lưu lên S3 nếu đã config S3
    });

    // Gọi lệnh ghi hình (RoomComposite - ghi toàn bộ bố cục phòng)
    const info = await egressClient.startRoomCompositeEgress(
      roomName,
      fileOutput,
      { layout: "grid" } // Hoặc layout tùy chỉnh của bạn
    );

    // Cập nhật trạng thái vào DB
    if (stream) {
      stream.recordingStatus = "recording";
      stream.egressId = info.egressId; // Lưu egressId để dùng khi stop
      await stream.save();
    }

    console.log(
      `✅ Recording started for ${roomName}, EgressID: ${info.egressId}`
    );
    return info;
  } catch (error) {
    console.error("Failed to start recording:", error.message);
  }
};

export const autoStopRecording = async (roomName) => {
  // Logic stop dựa vào egressId đã lưu trong DB
  try {
    const stream = await Stream.findOne({ roomName });
    if (stream && stream.egressId) {
      await egressClient.stopEgress(stream.egressId);
      stream.recordingStatus = "processing";
      await stream.save();
      console.log(`✅ Recording stopped for ${roomName}`);
    }
  } catch (error) {
    console.warn(
      "⚠️ Could not stop recording (maybe already stopped):",
      error.message
    );
  }
};