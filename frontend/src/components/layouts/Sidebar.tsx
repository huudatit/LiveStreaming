import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { userService } from "@/services/userService";
import { useAuthStore } from "@/stores/useAuthStore";

interface Channel {
  _id: string;
  username: string;
  displayName: string;
  avatar?: string;
  isLive: boolean;
}

export default function Sidebar() {
  const { user } = useAuthStore();
  const [followingChannels, setFollowingChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFollowingChannels = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const channels = await userService.getFollowingChannels();
        setFollowingChannels(channels);
      } catch (error) {
        console.error("Error fetching following channels:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchFollowingChannels();

    // Poll every 30 seconds to update live status
    const interval = setInterval(fetchFollowingChannels, 30000);

    // Listen for follow/unfollow events
    const handleFollowingUpdate = () => {
      fetchFollowingChannels();
    };
    window.addEventListener("followingUpdated", handleFollowingUpdate);

    return () => {
      clearInterval(interval);
      window.removeEventListener("followingUpdated", handleFollowingUpdate);
    };
  }, [user]);

  return (
    <aside className="hidden md:flex fixed left-0 top-14 h-screen w-60 flex-col border-white/10 bg-[#0b0f1a]/80 backdrop-blur-lg z-20 overflow-y-auto">
      {/* Thanh điều hướng (Navigation) */}
      <nav className="p-3 space-y-2 text-sm">
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `block px-3 py-2 rounded-lg transition ${
              isActive
                ? "bg-white/10 border border-white/10"
                : "hover:bg-white/5"
            }`
          }
        >
          Home
        </NavLink>

        <NavLink
          to="/dashboard"
          end
          className={({ isActive }) =>
            `block px-3 py-2 rounded-lg transition ${
              isActive
                ? "bg-white/10 border border-white/10"
                : "hover:bg-white/5"
            }`
          }
        >
          Dashboard
        </NavLink>

        {/* Khu vực kênh đang theo dõi (Subscriptions) */}
        <div className="mt-4">
          <p className="text-xs uppercase text-slate-400 mb-2 px-2">
            Subcriptions
          </p>

          {loading ? (
            <div className="px-2 py-1.5 text-xs text-slate-500">
              Đang tải...
            </div>
          ) : followingChannels.length === 0 ? (
            <div className="px-2 py-1.5 text-xs text-slate-500">
              Chưa đăng ký kênh nào
            </div>
          ) : (
            <div className="space-y-1 max-h-[calc(100vh-300px)] overflow-y-auto pr-2">
              {followingChannels.map((channel) => (
                <NavLink
                  key={channel._id}
                  to={`/channel/${channel.username}`}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 text-sm transition ${
                      isActive ? "bg-white/10" : ""
                    }`
                  }
                >
                  {/* Avatar */}
                  <div className="relative">
                    <div className="w-8 h-8 rounded-full overflow-hidden bg-purple-600 flex items-center justify-center shrink-0">
                      {channel.avatar ? (
                        <img
                          src={channel.avatar}
                          alt={channel.displayName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-xs font-semibold text-white">
                          {channel.displayName.slice(0, 2).toUpperCase()}
                        </span>
                      )}
                    </div>
                    {/* Live indicator */}
                    {channel.isLive && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-red-500 rounded-full border-2 border-[#0b0f1a]" />
                    )}
                  </div>

                  {/* Channel info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-300 truncate font-medium">
                      {channel.displayName}
                    </p>
                    {channel.isLive && (
                      <p className="text-xs text-red-400">● LIVE</p>
                    )}
                  </div>
                </NavLink>
              ))}
            </div>
          )}
        </div>
      </nav>
    </aside>
  );
}
