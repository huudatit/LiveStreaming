import { useEffect, useState } from "react";
import { fetchLiveStreams, fetchVods } from "@/services/streamService";
import LiveGrid from "@/components/home/LiveGrid";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import type { Stream } from "@/types/stream";
import type { Vod } from "@/types/vod";
import { Link } from "react-router-dom";


export default function HomePage() {
  const [liveStreams, setLiveStreams] = useState<Stream[]>([]);
  const [vods, setVods] = useState<Vod[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Tải dữ liệu trang Home: danh sách livestream đang diễn ra + danh sách video đã lưu (VOD)
    const load = async () => {
      try {
        // Gọi song song 2 API để giảm thời gian chờ
        const [liveRes, vodRes] = await Promise.allSettled([
          fetchLiveStreams(),
          fetchVods(),
        ]);
        if (liveRes.status === "fulfilled") setLiveStreams(liveRes.value);
        else console.error("fetchLiveStreams failed:", liveRes.reason);

        if (vodRes.status === "fulfilled") setVods(vodRes.value);
        else {
          console.error("fetchVodStreams failed:", vodRes.reason);
          setVods([]); // fallback
        }
      } finally {
        // Dù thành công hay lỗi thì cũng tắt loading để UI không bị treo
        setLoading(false);
      }
    };

    load();
  }, []);

  // Màn hình loading khi đang tải dữ liệu
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-white bg-[#0b0f1a]">
        Đang tải danh sách livestream và video...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0f1a] text-white px-6 py-10 space-y-10">
      {/* Khu vực: Livestream đang diễn ra */}
      <section>
        <h1 className="text-2xl font-semibold mb-4">🔴 Đang livestream</h1>
        <LiveGrid items={liveStreams} />
      </section>

      {/* Khu vực: Video đã lưu (VOD) */}
      <section>
        <h2 className="text-2xl font-semibold mb-4">🎬 Video đã lưu</h2>

        {vods.length === 0 ? (
          // Trường hợp không có VOD nào
          <p className="text-slate-400">
            Chưa có video nào được lưu. Hãy quay lại sau.
          </p>
        ) : (
          // Danh sách VOD hiển thị dạng lưới
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {vods.map((v) => (
              <Card
                key={v.vodId}
                className="bg-white/5 border-white/10 hover:bg-white/10 transition"
              >
                <CardHeader>
                  <CardTitle className="text-sm truncate">
                    {v.title || "Buổi phát không tên"}
                  </CardTitle>
                </CardHeader>

                <CardContent>
                  {/* Thumbnail giống YouTube */}
                  <Link to={`/vod/${v.vodId}`}>
                    <div className="relative w-full aspect-video rounded-lg overflow-hidden mb-2 bg-black/40">
                      {v.thumbnail ? (
                        <img
                          src={v.thumbnail}
                          alt={v.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full grid place-items-center text-slate-400 text-sm">
                          No thumbnail
                        </div>
                      )}
                      <div className="absolute bottom-2 right-2 text-xs bg-black/70 px-2 py-1 rounded">
                        {Math.round(v.duration)}s
                      </div>
                    </div>
                  </Link>

                  <p className="text-xs text-slate-400">
                    Creator:{" "}
                    {v.streamer?.displayName ||
                      v.streamer?.username ||
                      "Unknown"}
                  </p>
                  <p className="text-xs text-slate-400">
                    {new Date(v.recordedAt).toLocaleString()} • {v.views} views
                  </p>

                  {v.status && v.status !== "READY" && (
                    <p className="text-xs text-yellow-400 mt-2">
                      VOD đang xử lý ({v.status})
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
