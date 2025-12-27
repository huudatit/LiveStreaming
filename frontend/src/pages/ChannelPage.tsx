import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { userService } from "@/services/userService";
import { api } from "@/lib/axios";
import type { User } from "@/types/user";
import type { Vod } from "@/types/vod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, Clock, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/useAuthStore";
import { toast } from "sonner";

export default function ChannelPage() {
  const { username } = useParams<{ username: string }>();
  const { user: currentUser } = useAuthStore();
  const navigate = useNavigate();
  const [channelUser, setChannelUser] = useState<User | null>(null);
  const [vods, setVods] = useState<Vod[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  // Fetch channel info and VODs
  useEffect(() => {
    const fetchChannelData = async () => {
      if (!username) return;

      try {
        setLoading(true);

        // Fetch user profile
        const userProfile = await userService.getUserProfile(username);
        setChannelUser(userProfile);

        // Fetch VODs của streamer này
        const { data } = await api.get("/vod/list", {
          params: { streamerId: userProfile._id },
        });
        setVods(data.vods || []);

        // Check if following (nếu đã đăng nhập)
        if (currentUser && currentUser._id !== userProfile._id) {
          const following = await userService.checkIsFollowing(userProfile._id);
          setIsFollowing(following);
        }
      } catch (error) {
        console.error("Error fetching channel data:", error);
        toast.error("Không thể tải thông tin kênh");
      } finally {
        setLoading(false);
      }
    };

    fetchChannelData();
  }, [username, currentUser]);

  // Handle follow/unfollow
  const handleFollow = async () => {
    if (!channelUser || !currentUser) {
      toast.error("Vui lòng đăng nhập để theo dõi kênh");
      // Redirect to sign-in page after 1 second
      setTimeout(() => {
        navigate("/signin");
      }, 1000);
      return;
    }

    try {
      setFollowLoading(true);
      const result = await userService.followUser(channelUser._id);

      setIsFollowing(result.isFollowing);

      // Cập nhật follower count
      setChannelUser((prev) =>
        prev
          ? {
              ...prev,
              followers: result.isFollowing
                ? [...prev.followers, currentUser._id]
                : prev.followers.filter((id) => id !== currentUser._id),
            }
          : null
      );

      toast.success(
        result.isFollowing ? "Đã đăng ký kênh" : "Đã hủy đăng ký kênh"
      );

      // Dispatch event để Sidebar reload
      window.dispatchEvent(new CustomEvent("followingUpdated"));
    } catch (error) {
      console.error("Follow error:", error);
      toast.error("Có lỗi xảy ra, vui lòng thử lại");
    } finally {
      setFollowLoading(false);
    }
  };

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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b0f1a] text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading channel...</p>
        </div>
      </div>
    );
  }

  if (!channelUser) {
    return (
      <div className="min-h-screen bg-[#0b0f1a] text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Chanel not found</h1>
          <Link to="/" className="text-purple-400 hover:underline">
            Comeback Home Page!
          </Link>
        </div>
      </div>
    );
  }

  const isOwnChannel = currentUser?._id === channelUser._id;

  return (
    <div className="min-h-screen bg-[#0b0f1a] text-white">
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Channel Header */}
        <div className="flex items-start gap-6 pb-6 border-b border-white/10">
          {/* Avatar */}
          <div className="w-32 h-32 rounded-full overflow-hidden bg-purple-600 flex items-center justify-center shrink-0">
            {channelUser.avatarUrl ? (
              <img
                src={channelUser.avatarUrl}
                alt={channelUser.displayName}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-4xl font-bold text-white">
                {channelUser.displayName.slice(0, 2).toUpperCase()}
              </span>
            )}
          </div>

          {/* Channel Info */}
          <div className="flex-1">
            <h1 className="text-3xl font-bold mb-2">
              {channelUser.displayName}
            </h1>
            <p className="text-slate-400 mb-1">@{channelUser.username}</p>
            <p className="text-slate-400 mb-4">
              {channelUser.followers?.length || 0} Subscribers
            </p>

            {channelUser.bio && (
              <p className="text-slate-300 mb-4">{channelUser.bio}</p>
            )}

            {/* Follow Button */}
            {!isOwnChannel && currentUser && (
              <Button
                onClick={handleFollow}
                disabled={followLoading}
                className={
                  isFollowing
                    ? "bg-white/10 hover:bg-white/20 text-white"
                    : "bg-white hover:bg-white/90 text-black"
                }
              >
                {followLoading
                  ? "Processing..."
                  : isFollowing
                  ? "Subscribed"
                  : "Subscribe"}
              </Button>
            )}
          </div>
        </div>

        {/* VOD Section */}
        <div>
          <div className="flex items-center gap-2 mb-6">
            <Video className="w-6 h-6" />
            <h2 className="text-2xl font-semibold text-white">
              Video has played ({vods.length})
            </h2>
          </div>

          {vods.length === 0 ? (
            <div className="text-center py-12 text-white">
              <Video className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>This channel has no videos yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {vods.map((vod) => (
                <Link key={vod.vodId} to={`/vod/${vod.vodId}`}>
                  <Card className="bg-white/5 border-white/10 hover:bg-white/10 transition group">
                    {/* Thumbnail */}
                    <div className="aspect-video bg-black/60 relative overflow-hidden">
                      {vod.thumbnail ? (
                        <img
                          src={vod.thumbnail}
                          alt={vod.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white">
                          No thumbnail
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
                      <CardTitle className="text-sm truncate text-white">
                        {vod.title || "Video no name"}
                      </CardTitle>
                    </CardHeader>

                    <CardContent className="space-y-1">
                      <div className="flex items-center gap-3 text-xs text-white">
                        <span className="flex items-center gap-1">
                          <Eye className="size-3" />
                          {vod.views.toLocaleString()} views
                        </span>
                        {vod.recordedAt && (
                          <span>
                            {new Date(vod.recordedAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
