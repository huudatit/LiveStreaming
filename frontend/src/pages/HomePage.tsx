import { useEffect, useState } from "react";
import { fetchLiveStreams, fetchVodStreams } from "@/services/streamService";
import LiveGrid from "@/components/home/LiveGrid";
import VODGrid from "@/components/home/VODGrid";
import type { Stream } from "@/types/stream";
import type { VOD } from "@/types/stream";

export default function HomePage() {
  const [liveStreams, setLiveStreams] = useState<Stream[]>([]);
  const [vods, setVods] = useState<VOD[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [live, vodList] = await Promise.all([
          fetchLiveStreams(),
          fetchVodStreams(),
        ]);
        setLiveStreams(live);
        setVods(vodList);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-white bg-[#0b0f1a]">
        Đang tải danh sách livestream và video...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0f1a] text-white px-6 py-10 space-y-10">
      {/* Live Streams Section */}
      <section>
        <h1 className="text-2xl font-semibold mb-4">🔴 Đang livestream</h1>
        <LiveGrid items={liveStreams} />
      </section>

      {/* VOD Section */}
      <section>
        <h2 className="text-2xl font-semibold mb-4">🎬 Video đã lưu (VOD)</h2>
        <VODGrid items={vods} />
      </section>
    </div>
  );
}
