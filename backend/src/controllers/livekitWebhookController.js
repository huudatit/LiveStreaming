import {
  autoStartRecording,
  autoStopRecording,
} from "../services/vodAutoService.js";

export async function handleLivekitWebhook(req, res) {
  try {
    // bạn đã verify và decode event rồi thì event nằm ở đây
    const event = req.livekitEvent; // hoặc event bạn parse được

    const roomName = event.ingressInfo?.roomName;

    if (event.event === "ingress_started" && roomName) {
      await autoStartRecording(roomName);
    }

    if (event.event === "ingress_ended" && roomName) {
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
