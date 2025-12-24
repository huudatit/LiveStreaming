import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  LiveKitRoom,
  useTracks,
  VideoTrack,
  AudioTrack,
  useRemoteParticipants,
} from "@livekit/components-react";
import { Track, VideoQuality } from "livekit-client";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { fetchStreamDetail, fetchViewerToken } from "@/services/streamService";
import ReactionButtons from "@/components/stream/ReactionButtons";
import { useStreamStore } from "@/stores/useStreamStore";
import { useAuthStore } from "@/stores/useAuthStore";
import ChatBox from "@/components/chat/ChatBox";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import pauseIcon from "@/assets/pause.png";
import continueIcon from "@/assets/continue.png";
import muteIcon from "@/assets/mute.png";
import soundIcon from "@/assets/sound.png";
import ReactionOverlay from "@/components/stream/ReactionOverlay";
import type { Stream } from "@/types/stream";
import { api } from "@/lib/axios";

function Header({ stream }: { stream: Stream | null }) {
  const { user: currentUser } = useAuthStore();
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const streamer =
    stream && typeof stream.streamer !== "string" ? stream.streamer : null;

  const channelName = streamer?.displayName || "Channel";
  const avatarUrl = streamer?.avatarUrl;
  const streamerId =
    typeof stream?.streamer === "string" ? stream.streamer : streamer?._id;

  // Lấy số lượng followers và kiểm tra trạng thái follow
  useEffect(() => {
    const checkFollowStatus = async () => {
      if (!streamerId || !currentUser) return;

      try {
        const { data } = await api.get(`/users/${streamerId}/is-following`);
        setIsFollowing(data.isFollowing);
      } catch (error) {
        console.error("Error checking follow status:", error);
      }
    };

    const getFollowersCount = async () => {
      if (!streamer?.username) return;

      try {
        const { data } = await api.get(`/users/${streamer.username}`);
        setFollowersCount(
          data.user.followersCount || streamer.followers?.length || 0
        );
      } catch (error) {
        console.error("Error getting followers count:", error);
        setFollowersCount(streamer.followers?.length || 0);
      }
    };

    checkFollowStatus();
    getFollowersCount();
  }, [streamerId, currentUser, streamer]);

  // Xử lý follow/unfollow
  const handleFollow = async () => {
    if (!currentUser) {
      toast.error("Vui lòng đăng nhập để theo dõi");
      return;
    }

    if (!streamerId) {
      toast.error("Không tìm thấy thông tin streamer");
      return;
    }

    try {
      setLoading(true);
      const { data } = await api.post(`/users/${streamerId}/follow`);

      setIsFollowing(data.isFollowing);
      setFollowersCount(data.followersCount);

      toast.success(data.message);

      // Dispatch custom event để Sidebar reload danh sách following
      window.dispatchEvent(new CustomEvent("followingUpdated"));
    } catch (error) {
      console.error("Error following user:", error);
      toast.error("Không thể thực hiện hành động");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <h1 className="text-xl lg:text-2xl font-semibold leading-snug">
        {stream?.title ?? "Livestream"}
      </h1>

      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          {/* Avatar */}
          <div className="h-10 w-10 rounded-full bg-white/10 overflow-hidden shrink-0">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={channelName}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="h-full w-full grid place-items-center text-xs text-slate-300 font-semibold">
                {channelName.slice(0, 2).toUpperCase()}
              </div>
            )}
          </div>

          {/* Channel Info */}
          <div className="min-w-0">
            <p className="font-medium truncate">{channelName}</p>
            <p className="text-xs text-slate-400 truncate">
              {followersCount.toLocaleString()} người theo dõi •{" "}
              {stream?.isLive ? "Đang LIVE" : stream?.status}
            </p>
          </div>
        </div>

        {/* Follow Button & Share */}
        <div className="flex items-center gap-2">
          {/* Chỉ hiển thị nút Follow nếu không phải là streamer của chính mình */}
          {currentUser?._id !== streamerId && (
            <Button
              onClick={handleFollow}
              disabled={loading}
              className={`rounded-full px-6 font-medium transition ${
                isFollowing
                  ? "bg-white/10 hover:bg-white/20 text-white"
                  : "bg-white text-black hover:bg-white/90"
              }`}
              size="default"
            >
              {loading ? "..." : isFollowing ? "Đã theo dõi" : "Theo dõi"}
            </Button>
          )}

          <Button
            variant="outline"
            size="icon"
            className="rounded-full bg-white/10 hover:bg-white/15 border-white/10"
            onClick={() => {
              navigator.clipboard.writeText(window.location.href);
              toast.success("Đã sao chép link!");
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
              <polyline points="16 6 12 2 8 6" />
              <line x1="12" x2="12" y1="2" y2="15" />
            </svg>
          </Button>
        </div>
      </div>

      {/* Description */}
      {stream?.description && (
        <div className="rounded-xl bg-white/5 border border-white/10 p-3 text-sm text-slate-200 whitespace-pre-wrap">
          {stream.description}
        </div>
      )}
    </div>
  );
}

function StreamView({
  reactions,
}: {
  reactions: { id: string; emoji: string; x: number; delay: number }[];
}) {
  const participants = useRemoteParticipants();
  const tracks = useTracks([Track.Source.Camera, Track.Source.Microphone]);

  const videoTrackRef = tracks.find((t) => t.source === Track.Source.Camera);
  const audioTrackRef = tracks.find(
    (t) => t.source === Track.Source.Microphone
  );

  // publication (RemoteTrackPublication) dùng để subscribe/unsubscribe
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const videoPub = videoTrackRef?.publication as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const audioPub = audioTrackRef?.publication as any;

  const [paused, setPaused] = useState(false); // pause = unsubscribe cả video+audio
  const [muted, setMuted] = useState(false); // mute = unsubscribe audio
  const [quality, setQuality] = useState<VideoQuality>(VideoQuality.HIGH);

  // Helper: subscribe/unsubscribe an toàn
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const setSubscribedSafe = async (pub: any, subscribed: boolean) => {
    if (!pub) return;
    if (typeof pub.setSubscribed === "function") {
      await pub.setSubscribed(subscribed);
      return;
    }
    // fallback hiếm: disable track
    if (pub.track && typeof pub.track.setEnabled === "function") {
      pub.track.setEnabled(subscribed);
    }
  };

  // Helper: set quality an toàn (tránh crash như lỗi trước)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const setQualitySafe = async (pub: any, q: VideoQuality) => {
    if (!pub) return;

    // Tùy phiên bản, method có thể khác nhau
    if (typeof pub.setVideoQuality === "function") {
      pub.setVideoQuality(q);
      return;
    }
    if (typeof pub.setPreferredVideoQuality === "function") {
      pub.setPreferredVideoQuality(q);
      return;
    }

    console.warn(
      "Quality switching not supported by this publication/version",
      pub
    );
  };

  const settings =
    (
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      videoTrackRef?.publication?.track as any
    )?.mediaStreamTrack?.getSettings?.();

  console.log("Current video settings:", settings);

  // Nếu chưa có remote participant nào (streamer chưa publish)
  if (!participants.length) {
    return (
      <div className="aspect-video rounded-xl border border-white/10 grid place-items-center text-white">
        Đang chờ streamer…
      </div>
    );
  }

  const onTogglePause = async () => {
    // Pause = ngừng nhận video + audio
    if (!paused) {
      await setSubscribedSafe(videoPub, false);
      await setSubscribedSafe(audioPub, false);
      setPaused(true);
      return;
    }

    // Continue = nhận lại video + audio (audio phụ thuộc muted)
    await setSubscribedSafe(videoPub, true);
    await setSubscribedSafe(audioPub, !muted);
    setPaused(false);
  };

  const onToggleMute = async () => {
    // Mute chỉ ảnh hưởng audio; nếu đang pause thì chỉ đổi state, không subscribe lại
    if (!audioPub) {
      setMuted((m) => !m);
      return;
    }

    if (!muted) {
      await setSubscribedSafe(audioPub, false);
      setMuted(true);
      return;
    }

    // Unmute: chỉ subscribe audio nếu không paused
    if (!paused) await setSubscribedSafe(audioPub, true);
    setMuted(false);
  };

  const onChangeQuality = async (q: VideoQuality) => {
    setQuality(q);
    await setQualitySafe(videoPub, q);
  };

  return (
    <div className="relative aspect-video rounded-xl overflow-hidden bg-black">
      {/* Video fill full */}
      {videoTrackRef && (
        <VideoTrack
          trackRef={videoTrackRef}
          className="absolute inset-0 w-full h-full object-contain"
        />
      )}

      {/* Audio (sẽ bị mute/pause bằng setSubscribed) */}
      <ReactionOverlay reactions={reactions} />
      {audioTrackRef && <AudioTrack trackRef={audioTrackRef} />}

      {/* LIVE + viewer count */}
      <div className="absolute top-3 left-3 flex items-center gap-2 z-20">
        <div className="bg-black/60 px-3 py-1.5 rounded-lg text-sm">
          <span className="text-red-500">●</span> LIVE
        </div>
        <div className="bg-black/60 px-3 py-1.5 rounded-lg text-sm">
          {participants.length} đang xem
        </div>
      </div>

      {/* Minimal controls */}
      <div className="absolute inset-x-0 bottom-0 z-20 p-3">
        <div className="bg-black/55 backdrop-blur rounded-xl px-3 py-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Button
              onClick={onTogglePause}
              className="bg-white/10 hover:bg-white/20"
              variant="secondary"
            >
              <img
                src={paused ? continueIcon : pauseIcon}
                alt={paused ? "Continue" : "Pause"}
                className="w-5 h-5"
              />
            </Button>

            <Button
              onClick={onToggleMute}
              className="bg-white/10 hover:bg-white/20"
              variant="secondary"
            >
              <img
                src={muted ? soundIcon : muteIcon}
                alt={muted ? "Unmute" : "Mute"}
                className="w-5 h-5"
              />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-200/80">Quality:</span>

            <Select
              value={String(quality)}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              onValueChange={(v) => onChangeQuality(Number(v) as any)}
            >
              <SelectTrigger className="h-9 w-[110px] bg-white/10 border-white/10 text-white hover:bg-white/15 rounded-xl focus:ring-0">
                <SelectValue placeholder="Quality" />
              </SelectTrigger>
              <SelectContent className="bg-[#0b0f1a]/95 border-white/10 text-white backdrop-blur">
                <SelectItem value={String(0)}>480P</SelectItem>
                <SelectItem value={String(1)}>720P</SelectItem>
                <SelectItem value={String(2)}>1080P</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ViewerPage() {
  const params = useParams();
  const room = params.room ?? params.streamId ?? "";
  const { user } = useAuthStore();
  const displayName = user?.displayName || "guest";

  // Lưu ý: sử dụng room (streamId) cho state realtime (reactions/chat) để đồng bộ
  const { reactions } = useStreamStore(room, displayName, user?._id);

  const [token, setToken] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const serverUrl = import.meta.env.VITE_LIVEKIT_URL as string;

  const [streamDetail, setStreamDetail] = useState<Stream | null>(null);

  // Tạo identity chỉ 1 lần cho toàn bộ vòng đời component (ưu tiên lấy từ sessionStorage)
  const [identity] = useState(() => {
    const uid = user?._id ?? "guest";
    const rn = streamDetail?.room ?? "pending";
    const key = `viewer_identity_${uid}_${rn}`;
    const saved = sessionStorage.getItem(key);
    if (saved) return saved;

    const newId = `viewer_${uid}_${crypto.randomUUID()}`;
    sessionStorage.setItem(key, newId);
    return newId;
  });

  // Lấy token để viewer join vào phòng LiveKit
  useEffect(() => {
    (async () => {
      try {
        const t = await fetchViewerToken(room, identity);
        setToken(t);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (e: any) {
        setErr(e.response?.data?.message || e.message || "Không thể lấy token");
      }
    })();
  }, [room, identity]);

  // Lấy thông tin buổi Stream
  useEffect(() => {
    (async () => {
      try {
        const s = await fetchStreamDetail(room);
        setStreamDetail(s);
      } catch (e) {
        console.warn("fetchStreamDetail failed", e);
        setStreamDetail(null);
      }
    })();
  }, [room]);

  // Hiển thị lỗi nếu có
  if (err)
    return (
      <div className="min-h-screen grid place-items-center text-white">
        {err}
      </div>
    );

  // Đang chờ token
  if (!token)
    return (
      <div className="min-h-screen grid place-items-center text-white">
        Đang tải stream…
      </div>
    );
  



  // Màn hình "sẵn sàng xem" để yêu cầu người dùng bấm nút (tránh autoplay audio bị chặn)
  if (!ready) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0b0f1a] text-white">
        <div className="text-center">
          <h1 className="text-2xl font-semibold mb-4">
            🎬 Sẵn sàng xem livestream
          </h1>
          <p className="text-slate-400 mb-6">
            Nhấn nút bên dưới để bắt đầu và bật âm thanh.
          </p>
          <button
            onClick={() => setReady(true)}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-xl font-medium text-white transition"
          >
            Bắt đầu xem 🔊
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0f1a] text-white p-4">
      <div className="max-w-8xl mx-auto flex flex-col lg:flex-row gap-4 h-[calc(100vh-5rem)]">
        {/* Khu vực video + reactions: chiếm phần lớn màn hình */}
        <div className="flex-1 relative">
          <LiveKitRoom
            serverUrl={serverUrl}
            token={token}
            connect={ready}
            audio={false}
            video={false}
            options={{
              adaptiveStream: true,
              dynacast: true,
            }}
            onConnected={() => toast.success("Đã kết nối tới LiveKit!")}
          >
            <StreamView reactions={reactions} />
          </LiveKitRoom>

          <Header stream={streamDetail} />
        </div>

        {/* Khu vực chat: đặt ở cột bên phải */}
        <div className="w-full lg:w-1/4 flex flex-col">
          <div className="flex-1">
            {/* Truyền room (streamId) cho cả streamId và roomName để đồng bộ realtime */}
            <ChatBox streamId={room} roomName={room} />
            <ReactionButtons roomName={room} />
          </div>
        </div>
      </div>
    </div>
  );
}
