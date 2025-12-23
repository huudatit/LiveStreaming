import { EgressClient, EncodedFileOutput } from "livekit-server-sdk";
import Stream from "../models/Stream.js";
import VOD from "../models/VOD.js";
import User from "../models/User.js";

const host = process.env.LIVEKIT_API_URL; // https://xxx.livekit.cloud
const apiKey = process.env.LIVEKIT_API_KEY;
const apiSecret = process.env.LIVEKIT_API_SECRET;

export const egressClient = new EgressClient(host, apiKey, apiSecret);

export async function autoStartRecording(roomName) {
  // 1) tìm stream theo roomName (schema của bạn)
  const stream = await Stream.findOne({ roomName, status: "live" });
  if (!stream) return;

  // 2) idempotent: nếu đã có VOD đang xử lý thì không tạo nữa
  const existing = await VOD.findOne({
    streamId: roomName,
    status: "PROCESSING",
  });
  if (existing) return;

  const streamer = await User.findById(stream.streamerId)
    .select("username displayName avatar")
    .lean();

  const vodId = `vod_${roomName}_${Date.now()}`;

  // 3) output file (bạn cần cấu hình storage s3/r2/minio thật)
  const fileOutput = new EncodedFileOutput({
    filepath: `vods/${vodId}.mp4`,
    // TODO: cấu hình storage thật tại đây (S3/R2/MinIO)
    // s3: { access_key, secret, region, bucket, endpoint? }
  });

  // 4) start egress (record)
  const egress = await egressClient.startRoomCompositeEgress(roomName, {
    file: fileOutput,
    preset: "H264_1080P_30", // OBS bạn đang push 1080p 30fps
  });

  // 5) tạo bản ghi VOD
  await VOD.create({
    vodId,
    streamId: roomName,
    title: stream.title || "Untitled VOD",
    thumbnail: stream.thumbnailUrl ?? null,
    streamerId: stream.streamerId,
    streamerUsername: streamer?.username || "unknown",
    streamerDisplayName:
      streamer?.displayName || streamer?.username || "unknown",
    streamerAvatar: streamer?.avatar ?? null,
    egressId: egress.egressId,
    status: "PROCESSING",
  });
}

export async function autoStopRecording(roomName) {
  const vod = await VOD.findOne({ streamId: roomName, status: "PROCESSING" });
  if (!vod?.egressId) return;

  await egressClient.stopEgress(vod.egressId);
  // giữ PROCESSING, chờ webhook egress_ended để set READY + vodLink
}
