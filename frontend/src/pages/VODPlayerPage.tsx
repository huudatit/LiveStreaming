import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { vodService } from "@/services/streamService";
import type { VOD } from "@/types/stream";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, Calendar } from "lucide-react";

export default function VODPlayerPage() {
  const { vodId } = useParams<{ vodId: string }>();
  const [vod, setVod] = useState<VOD | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchVOD = async () => {
      if (!vodId) return;

      try {
        const vodData = await vodService.getById(vodId);
        setVod(vodData);
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
        <a href="/" className="text-purple-400 hover:underline">
          Quay lại trang chủ
        </a>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0f1a] text-white p-4">
      <div className="max-w-6xl mx-auto space-y-4">
        {/* Video Player */}
        <div className="aspect-video bg-black rounded-xl overflow-hidden">
          <video
            src={vod.vodLink}
            controls
            className="w-full h-full"
            autoPlay
          />
        </div>

        {/* Video Info */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-xl">{vod.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Thống kê */}
            <div className="flex items-center gap-6 text-sm text-slate-400">
              <span className="flex items-center gap-2">
                <Eye className="size-4" />
                {vod.views.toLocaleString()} lượt xem
              </span>
              {vod.createdAt && (
                <span className="flex items-center gap-2">
                  <Calendar className="size-4" />
                  {new Date(vod.createdAt).toLocaleDateString("vi-VN", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
              )}
            </div>

            {/* Streamer Info */}
            <div className="flex items-center gap-3 pt-4 border-t border-white/10">
              <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center font-semibold">
                {vod.streamerUsername?.[0]?.toUpperCase() || "?"}
              </div>
              <div>
                <p className="font-medium">
                  {vod.streamerUsername || "Unknown"}
                </p>
                <p className="text-sm text-slate-400">Streamer</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Đề xuất video liên quan */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-sm">Video liên quan</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-400 text-sm">Đang phát triển...</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}