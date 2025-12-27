import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import type { Vod } from "@/types/vod";
import { Eye, Clock } from "lucide-react";

function formatDuration(seconds?: number) {
  if (!seconds) return "N/A";
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  }
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export default function VODGrid({ items }: { items: Vod[] }) {
  if (!items?.length) {
    return (
      <p className="text-white">
        No videos have been saved yet. Please come back later.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
      {items.map((vod) => (
        <Link key={vod.vodId} to={`/vod/${vod.vodId}`}>
          <Card className="bg-white/5 border-white/10 hover:bg-white/10 transition group">
            {/* Thumbnail */}
            <div className="aspect-video bg-black/60 relative overflow-hidden">
              {vod.thumbnail ? (
                <img
                  src={vod.thumbnail}
                  alt={vod.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 text-white"
                />
              ) : vod.vodLink ? (
                <div className="w-full h-full flex items-center justify-center text-slate-500">
                  <video
                    src={vod.vodLink}
                    className="w-full h-full object-cover text-white"
                    muted
                  />
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white">
                  No video available
                </div>
              )}

              {/* Duration badge */}
              {vod.duration && (
                <div className="absolute bottom-2 right-2 bg-black/80 px-2 py-1 rounded text-xs flex items-center gap-1 text-white">
                  <Clock className="size-3" />
                  {formatDuration(vod.duration)}
                </div>
              )}
            </div>

            {/* Info */}
            <CardHeader className="pb-2">
              <CardTitle className="text-sm truncate">
                {vod.title || "Video no name"}
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-1 text-white">
              <p className="text-xs text-slate-400">
                {vod.streamer.displayName || "Unknown"}
              </p>
              <div className="flex items-center gap-3 text-xs text-white">
                <span className="flex items-center gap-1 text-white">
                  <Eye className="size-3" />
                  {vod.views.toLocaleString()} views
                </span>
                {vod.createdAt && (
                  <span>{new Date(vod.createdAt).toLocaleDateString()}</span>
                )}
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
