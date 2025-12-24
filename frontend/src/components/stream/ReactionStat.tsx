import { useEffect, useState } from "react";
import { api } from "@/lib/axios";
import { socket } from "@/services/socket";

interface ReactionStat {
  emoji: string;
  count: number;
  percentage: string;
}

interface ReactionStatsProps {
  streamId: string;
}

export default function ReactionStats({ streamId }: ReactionStatsProps) {
  const [stats, setStats] = useState<ReactionStat[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data } = await api.get(`/reactions/stats/${streamId}`);
        if (data.success) {
          setStats(data.reactions);
          setTotal(data.total);
        }
      } catch (error) {
        console.error("Error fetching reaction stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();

    // 🆕 Listen for real-time reaction stats updates via Socket.IO
    const handleReactionStatsUpdate = (data: {
      streamId: string;
      reactions: ReactionStat[];
      total: number;
    }) => {
      // Only update if it's for this stream
      if (data.streamId === streamId) {
        console.log("📊 Reaction stats updated in real-time:", data);
        setStats(data.reactions);
        setTotal(data.total);
      }
    };

    socket.on("reaction-stats-updated", handleReactionStatsUpdate);

    // Refresh every 30 seconds as fallback
    const interval = setInterval(fetchStats, 30000);
    
    return () => {
      clearInterval(interval);
      socket.off("reaction-stats-updated", handleReactionStatsUpdate);
    };
  }, [streamId]);

  if (loading) {
    return (
      <div className="p-4 bg-white/5 rounded-xl border border-white/10">
        <div className="text-sm text-slate-400">Đang tải thống kê...</div>
      </div>
    );
  }

  if (total === 0) {
    return (
      <div className="p-4 bg-white/5 rounded-xl border border-white/10">
        <div className="text-sm text-slate-400">
          Chưa có reaction nào. Hãy là người đầu tiên!
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-white/5 rounded-xl border border-white/10">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-300">
          Thống kê Reactions
        </h3>
        <span className="text-xs text-slate-500">{total} tổng</span>
      </div>

      <div className="space-y-2">
        {stats.map(({ emoji, count, percentage }) => (
          <div key={emoji} className="flex items-center gap-3">
            <span className="text-2xl">{emoji}</span>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-slate-400">{count}</span>
                <span className="text-xs text-slate-400">{percentage}%</span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-linear-to-r from-purple-500 to-pink-500 h-full transition-all duration-500"
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
