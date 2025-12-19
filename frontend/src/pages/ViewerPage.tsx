import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  LiveKitRoom,
  useTracks,
  VideoTrack,
  AudioTrack,
  useRemoteParticipants,
} from "@livekit/components-react";
import { RemoteTrackPublication, Track } from "livekit-client";
import { streamService } from "@/services/streamService";
import ReactionButtons from "@/components/stream/ReactionButtons";
import { useStreamStore } from "@/stores/useStreamStore";
import { useAuthStore } from "@/stores/useAuthStore";
import ChatBox from "@/components/chat/ChatBox";
import { toast } from "sonner";
import ResolutionSelector from "@/components/stream/ResolutionSelector";
import type { Stream } from "@/types/stream";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";

function StreamView() {
  const participants = useRemoteParticipants();
  const tracks = useTracks([Track.Source.Camera, Track.Source.Microphone]);
  const [paused, setPaused] = useState(false);
  const videoTrackRef = tracks.find((t) => t.source === Track.Source.Camera);
  const audioTrackRef = tracks.find(
    (t) => t.source === Track.Source.Microphone
  );

  if (!participants.length) {
    return (
      <div className="aspect-video rounded-xl border border-white/10 grid place-items-center text-white bg-black">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p>Đang chờ streamer...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative aspect-video rounded-xl overflow-hidden bg-black">
      {videoTrackRef && (
        <>
          <VideoTrack trackRef={videoTrackRef} />
          <ResolutionSelector track={videoTrackRef.publication} />
        </>
      )}
      {audioTrackRef && <AudioTrack trackRef={audioTrackRef} />}

      {/* Nút Play/Pause */}
      <Button
        onClick={() => {
          const vpub = videoTrackRef?.publication as
            | RemoteTrackPublication
            | undefined;
          const apub = audioTrackRef?.publication as
            | RemoteTrackPublication
            | undefined;

          if (!vpub) return;

          if (paused) {
            vpub.setSubscribed(true);
            apub?.setSubscribed(true);
          } else {
            vpub.setSubscribed(false);
            apub?.setSubscribed(false);
          }

          setPaused(!paused);
        }}
      >
        {paused ? "▶️ Tiếp tục" : "⏸️ Tạm dừng"}
      </Button>

      {/* Viewer count */}
      <div className="absolute top-3 left-3 bg-red-600/90 px-3 py-1.5 rounded-lg text-sm z-10 flex items-center gap-2">
        <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
        <span>{participants.length} đang xem</span>
      </div>
    </div>
  );
}

export default function ViewerPage() {
  const { streamId = "" } = useParams();
  const { user } = useAuthStore();
  const username = user?.username || "guest";

  const [stream, setStream] = useState<Stream | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const serverUrl = import.meta.env.VITE_LIVEKIT_URL as string;

  const { viewerCount } = useStreamStore(
    stream?.roomName || streamId,
    username,
    user?._id
  );

  // Tạo thông tin
  const [identity] = useState(() => {
    const saved = sessionStorage.getItem("viewer_identity");
    if (saved) return saved;
    const newId =
      user?.username || `viewer_${Math.floor(Math.random() * 10000)}`;
    sessionStorage.setItem("viewer_identity", newId);
    return newId;
  });

  // Lấy thông tin của buổi stream
  useEffect(() => {
    const fetchStream = async () => {
      try {
        const streamData = await streamService.getById(streamId);
        setStream(streamData);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (e: any) {
        setErr(e.response?.data?.message || "Stream không tồn tại");
      }
    };
    fetchStream();
  }, [streamId]);

  // Lấy viewer token
  useEffect(() => {
    const getToken = async () => {
      if (!streamId) return;
      try {
        const t = await streamService.getViewerToken(streamId, identity);
        setToken(t);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (e: any) {
        setErr(e.response?.data?.message || e.message || "Không thể lấy token");
      }
    };
    getToken();
  }, [streamId, identity]);

  if (err) {
    return (
      <div className="min-h-screen grid place-items-center text-white bg-[#0b0f1a]">
        <div className="text-center">
          <h1 className="text-2xl font-semibold mb-4">{err}</h1>
          <a href="/" className="text-purple-400 hover:underline">
            Quay lại trang chủ
          </a>
        </div>
      </div>
    );
  }

  if (!token || !stream) {
    return (
      <div className="min-h-screen grid place-items-center text-white bg-[#0b0f1a]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p>Đang tải stream...</p>
        </div>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0b0f1a] text-white">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-semibold mb-4">🎬 {stream.title}</h1>
          <p className="text-slate-400 mb-2">
            Streamer:{" "}
            <span className="text-white">{stream.streamerUsername}</span>
          </p>
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
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-4">
          {/* Video + Info */}
          <div className="space-y-4">
            {/* Video Player */}
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
              <StreamView />
            </LiveKitRoom>

            {/* Stream Info */}
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-xl">{stream.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {stream.description && (
                  <p className="text-slate-300 text-sm">{stream.description}</p>
                )}

                <div className="flex items-center justify-between pt-3 border-t border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center font-semibold">
                      {stream.streamerUsername?.[0]?.toUpperCase() || "?"}
                    </div>
                    <div>
                      <p className="font-medium">{stream.streamerUsername}</p>
                      <p className="text-sm text-slate-400">Streamer</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-slate-400">
                    <Eye className="size-4" />
                    <span>{viewerCount} Người xem</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Chat + Reactions */}
          <div className="space-y-4">
            <ChatBox streamId={streamId} roomName={stream.roomName} />
            <ReactionButtons roomName={stream.roomName} />
          </div>
        </div>
      </div>
    </div>
  );
}