import { useEffect, useState } from "react";
import {
  TrackPublication,
  RemoteVideoTrack,
  VideoQuality,
} from "livekit-client";

interface ResolutionSelectorProps {
  track?: TrackPublication;
}

export default function ResolutionSelector({ track }: ResolutionSelectorProps) {
  const [quality, setQuality] = useState<"auto" | "low" | "medium" | "high">(
    "auto"
  );

  useEffect(() => {
    // Chỉ xử lý nếu track tồn tại và là RemoteTrackPublication
    // (Local track không chỉnh được chất lượng nhận về)
    if (!track || !(track instanceof RemoteTrackPublication)) return;

    if (quality === "auto") {
      // Tự động
      track.setVideoQuality(VideoQuality.HIGH);
    } else {
      // Map string sang Enum VideoQuality
      let q = VideoQuality.HIGH;
      if (quality === "low") q = VideoQuality.LOW;
      if (quality === "medium") q = VideoQuality.MEDIUM;
      
      // Gọi hàm trên Publication (track)
      track.setVideoQuality(q);
    }
  }, [quality, track]);

  return (
    <div className="absolute bottom-3 right-3 bg-black/70 px-3 py-2 rounded-lg text-sm z-20">
      <select
        value={quality}
        onChange={(e) =>
          setQuality(e.target.value as "auto" | "low" | "medium" | "high")
        }
        className="bg-transparent hover:bg-purple-600 text-white outline-none cursor-pointer"
      >
        <option value="auto">Tự động</option>
        <option value="low">480p</option>
        <option value="medium">720p</option>
        <option value="high">1080p</option>
      </select>
    </div>
  );
}
