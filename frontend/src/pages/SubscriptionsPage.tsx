import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { userService } from "@/services/userService";
import { useAuthStore } from "@/stores/useAuthStore";
import { Card, CardContent } from "@/components/ui/card";
import { Users, Radio } from "lucide-react";
import { toast } from "sonner";

interface Channel {
  _id: string;
  username: string;
  displayName: string;
  avatar?: string;
  isLive: boolean;
}

export default function SubscriptionsPage() {
  const { user } = useAuthStore();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchChannels = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const followingChannels = await userService.getFollowingChannels();
        setChannels(followingChannels);
      } catch (error) {
        console.error("Error fetching following channels:", error);
        toast.error("Không thể tải danh sách kênh đã đăng ký");
      } finally {
        setLoading(false);
      }
    };

    fetchChannels();

    // Listen for follow/unfollow events
    const handleFollowingUpdate = () => {
      fetchChannels();
    };
    window.addEventListener("followingUpdated", handleFollowingUpdate);

    return () => {
      window.removeEventListener("followingUpdated", handleFollowingUpdate);
    };
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b0f1a] text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Đang tải...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0b0f1a] text-white flex items-center justify-center">
        <div className="text-center">
          <Users className="w-16 h-16 mx-auto mb-4 text-slate-500" />
          <h1 className="text-2xl font-bold mb-2">
            Vui lòng đăng nhập để xem các kênh đã đăng ký
          </h1>
          <Link to="/signin" className="text-purple-400 hover:underline">
            Đăng nhập ngay
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0f1a] text-white">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3 pb-4 border-b border-white/10">
          <Users className="w-8 h-8" />
          <div>
            <h1 className="text-3xl font-bold">Subscriptions</h1>
            <p className="text-slate-400">
              Các kênh bạn đã đăng ký ({channels.length})
            </p>
          </div>
        </div>

        {/* Channels Grid */}
        {channels.length === 0 ? (
          <div className="text-center py-16">
            <Users className="w-20 h-20 mx-auto mb-4 text-slate-600" />
            <h2 className="text-xl font-semibold mb-2 text-slate-300">
              Chưa đăng ký kênh nào
            </h2>
            <p className="text-slate-500 mb-4">
              Hãy tìm và đăng ký các kênh yêu thích của bạn!
            </p>
            <Link
              to="/"
              className="inline-block px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-xl font-medium transition"
            >
              Khám phá kênh
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {channels.map((channel) => (
              <Link key={channel._id} to={`/channel/${channel.username}`}>
                <Card className="bg-white/5 border-white/10 hover:bg-white/10 transition group h-full">
                  <CardContent className="p-4">
                    <div className="flex flex-col items-center text-center space-y-3">
                      {/* Avatar with live indicator */}
                      <div className="relative">
                        <div className="w-24 h-24 rounded-full overflow-hidden bg-purple-600 flex items-center justify-center">
                          {channel.avatar ? (
                            <img
                              src={channel.avatar}
                              alt={channel.displayName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-3xl font-bold text-white">
                              {channel.displayName.slice(0, 2).toUpperCase()}
                            </span>
                          )}
                        </div>
                        {/* Live badge */}
                        {channel.isLive && (
                          <div className="absolute -bottom-1 -right-1 bg-red-600 rounded-full px-2 py-1 flex items-center gap-1 border-2 border-[#0b0f1a]">
                            <Radio className="w-3 h-3 animate-pulse" />
                            <span className="text-xs font-bold">LIVE</span>
                          </div>
                        )}
                      </div>

                      {/* Channel info */}
                      <div className="w-full">
                        <h3 className="font-semibold text-lg truncate">
                          {channel.displayName}
                        </h3>
                        <p className="text-sm text-slate-400 truncate">
                          @{channel.username}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
