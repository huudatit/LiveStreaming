import { Card, CardContent } from "@/components/ui/card";
import LiveBadge from "./LiveBadge";
import { Link } from "react-router-dom";
import type { Stream } from "@/types/stream";
import { Eye } from "lucide-react";

export default function LiveCard({ s }: { s: Stream }) {
  const title = s.title || `Phòng: ${s.roomName}`;
  const thumbnail = s.thumbnail || null;

  return (
    <Link to={`/watch/${s.streamId}`}>
      <Card className="group overflow-hidden border-white/10 bg-white/5 hover:bg-white/10 transition">
        {/* Thumbnail */}
        <div className="aspect-video bg-black/60 relative overflow-hidden">
          {thumbnail ? (
            <img
              src={thumbnail}
              alt={title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-slate-500 text-center">
                <div className="text-4xl mb-2">🎬</div>
                <p className="text-sm">Live Stream</p>
              </div>
            </div>
          )}

          {/* Live Badge */}
          <div className="absolute left-2 top-2">
            <LiveBadge live={s.status === "LIVE"} />
          </div>

          {/* Viewer Count */}
          <div className="absolute bottom-2 right-2 bg-black/80 px-2 py-1 rounded text-xs flex items-center gap-1">
            <Eye className="size-3" />
            {s.views || 0}
          </div>
        </div>

        {/* Info */}
        <CardContent className="p-3 text-white space-y-1">
          <p className="font-medium truncate">{title}</p>
          <p className="text-xs text-slate-400">
            {s.streamerUsername || "Unknown"}
          </p>
          {s.startedAt && (
            <p className="text-xs text-slate-500">
              {new Date(s.startedAt).toLocaleString("vi-VN", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
