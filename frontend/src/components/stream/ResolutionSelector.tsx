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
    if (!track) return;

    const videoTrack = track.videoTrack;

    // 🟢 Bước 1: chỉ xử lý nếu đây là RemoteVideoTrack
    if (!(videoTrack instanceof RemoteVideoTrack)) return;

    // 🟢 Bước 2: xử lý logic chọn độ phân giải
    if (quality === "auto") {
      // Cho phép LiveKit tự động chọn layer
      videoTrack.setPreferredVideoQuality(VideoQuality.HIGH);
    } else {
      // ép chọn tầng cụ thể (0,1,2)
      const layer = quality === "low" ? 0 : quality === "medium" ? 1 : 2;
      videoTrack.setPreferredLayer(layer);
    }
  }, [quality, track]);

  return (
    <div className="absolute bottom-3 right-3 bg-black/70 px-3 py-2 rounded-lg text-sm z-20">
      <select
        value={quality}
        onChange={(e) =>
          setQuality(e.target.value as "auto" | "low" | "medium" | "high")
        }
        className="bg-transparent text-white outline-none"
      >
        <option value="auto">Tự động</option>
        <option value="low">480p</option>
        <option value="medium">720p</option>
        <option value="high">1080p</option>
      </select>
    </div>
  );
}
