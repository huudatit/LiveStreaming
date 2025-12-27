// src/services/livekitService.js
import {
  RoomServiceClient,
  IngressClient,
  IngressInput,
  IngressAudioEncodingPreset,
  IngressVideoEncodingPreset,
  AccessToken,
} from "livekit-server-sdk";
import { livekitConfig } from "../config/livekit.js";

// ====== Clients ======
const roomService = new RoomServiceClient(
  livekitConfig.url,
  livekitConfig.apiKey,
  livekitConfig.apiSecret
);

const ingressClient = new IngressClient(livekitConfig.url, {
  apiKey: livekitConfig.apiKey,
  apiSecret: livekitConfig.apiSecret,
});

// ====== Token ======
export function createLiveKitToken(
  roomName,
  participantName,
  isPublisher = false
) {
  if (!livekitConfig.apiKey || !livekitConfig.apiSecret) {
    throw new Error("Missing LiveKit API credentials");
  }
  const at = new AccessToken(livekitConfig.apiKey, livekitConfig.apiSecret, {
    identity: participantName,
    name: participantName,
  });
  at.addGrant({
    room: roomName,
    roomJoin: true,
    canPublish: isPublisher,
    canSubscribe: true,
    canPublishData: true,
  });
  return at.toJwt();
}

// ====== Room APIs ======
export async function createRoom(roomName, metadata = {}) {
  return roomService.createRoom({
    name: roomName,
    emptyTimeout: 300,
    maxParticipants: 100,
    metadata: JSON.stringify(metadata),
  });
}
export async function deleteRoom(roomName) {
  try {
    await roomService.deleteRoom(roomName);
    return true;
  } catch (e) {
    return false;
  }
}
export const listRooms = () => roomService.listRooms();
export const listParticipants = (roomName) =>
  roomService.listParticipants(roomName);

// ====== Ingress APIs ======
// type: "RTMP" | "WHIP"
export async function createIngress({
  type = "RTMP",
  name = "default-ingress",
  roomName,
  participantIdentity,
  participantName,
}) {
  const inputType =
    type === "WHIP" ? IngressInput.WHIP_INPUT : IngressInput.RTMP_INPUT;

  const { ingressInfo } = await ingressClient.createIngress({
    inputType,
    name,
    roomName,
    participantIdentity,
    participantName,
    audio: { preset: IngressAudioEncodingPreset.OPUS_STEREO_96K },
    video: { preset: IngressVideoEncodingPreset.H264_1080P_30FPS_3_LAYERS },
  });

  return {
    ingressId: ingressInfo?.ingressId,
    serverUrl: livekitConfig.rtmpServerUrl,
    streamKey: ingressInfo?.streamKey ?? "",
    type,
  };
}

export async function listIngresses() {
  const { items } = await ingressClient.listIngress({});
  return items ?? [];
}

export async function deleteIngress(ingressId) {
  await ingressClient.deleteIngress({ ingressId });
  return { ok: true };
}