import { Card, CardContent } from "@/components/ui/card";
import LiveBadge from "./LiveBadge";
import { Link } from "react-router-dom";
import type { Stream } from "@/types/stream";

export default function LiveCard({ s }: { s: Stream }) {
  const title = s.metadata || s.title || `Phòng: ${s.room}`;
  return (
    <Link to={`/watch/${encodeURIComponent(s.room)}`}>
      <Card className="group overflow-hidden border-white/10 bg-white/5 hover:bg-white/10 transition">
        <div className="aspect-video bg-black/60 grid place-items-center relative">
          <div className="absolute left-2 top-2">
            <LiveBadge live />
          </div>
          <div className="rounded px-2 py-1 text-xs bg-black/50 text-white">
            {s.viewerCount ?? 0} Watching
          </div>
        </div>
        <CardContent className="p-3 text-white">
          <p className="font-medium truncate">{title}</p>
          <p className="text-xs text-slate-400 mt-1">
            {s.startedAt
              ? `Started: ${new Date(s.startedAt).toLocaleString()}`
              : "Now"}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}