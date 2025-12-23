import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "@/lib/axios";
import type { Vod } from "@/types/vod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, Calendar, Clock } from "lucide-react";
import { toast } from "sonner";

export default function VODPlayerPage() {
  const { vodId } = useParams<{ vodId: string }>();
  const [vod, setVod] = useState<Vod | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchVOD = async () => {
      if (!vodId) {
        setError("Thiếu vodId");
        setLoading(false);
        return;
      }

      try {
        const { data } = await api.get(`/vod/${vodId}`);
        if (data.success) {
          setVod(data.vod);
        } else {
          setError("Không tìm thấy video");
        }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (err: any) {
        console.error("Error fetching VOD:", err);
        setError(err.response?.data?.message || "Không thể tải video");
      } finally {
        setLoading(false);
      }
    };

    fetchVOD();
  }, [vodId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0b0f1a] text-white">
        Đang tải video...
      </div>
    );
  }

  if (error || !vod) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0b0f1a] text-white">
        <h1 className="text-2xl font-semibold mb-3">
          {error || "Video không tồn tại"}
        </h1>
        <Link to="/" className="text-purple-400 hover:underline">
          Quay lại trang chủ
        </Link>
      </div>
    );
  }

  const formatDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, "0")}:${secs
        .toString()
        .padStart(2, "0")}`;
    }
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen bg-[#0b0f1a] text-white p-4">
      <div className="max-w-6xl mx-auto space-y-4">
        {/* Video Player */}
        <div className="aspect-video bg-black rounded-xl overflow-hidden">
          {vod.vodLink ? (
            <video
              src={vod.vodLink}
              controls
              className="w-full h-full"
              autoPlay
            />
          ) : (
            <div className="w-full h-full grid place-items-center text-slate-300">
              {vod.status === "PROCESSING"
                ? "VOD đang được xử lý, vui lòng quay lại sau..."
                : "VOD chưa sẵn sàng"}
            </div>
          )}
        </div>

        {/* Video Info */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-xl">{vod.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Stats */}
            <div className="flex items-center gap-6 text-sm text-slate-400">
              <span className="flex items-center gap-2">
                <Eye className="size-4" />
                {vod.views.toLocaleString()} lượt xem
              </span>

              <span className="flex items-center gap-2">
                <Clock className="size-4" />
                {formatDuration(vod.duration)}
              </span>

              {vod.recordedAt && (
                <span className="flex items-center gap-2">
                  <Calendar className="size-4" />
                  {new Date(vod.recordedAt).toLocaleDateString("vi-VN")}
                </span>
              )}
            </div>

            {/* Streamer Info */}
            <div className="flex items-center gap-3 pt-4 border-t border-white/10">
              <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center font-semibold">
                {vod.streamer?.displayName?.[0]?.toUpperCase() || "?"}
              </div>
              <div>
                <p className="font-medium">
                  {vod.streamer?.displayName ||
                    vod.streamer?.username ||
                    "Unknown"}
                </p>
                <p className="text-sm text-slate-400">Streamer</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
