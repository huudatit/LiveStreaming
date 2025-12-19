import { useEffect, useState } from "react";
import { api } from "@/lib/axios";
import { toast } from "sonner";
import { useAuthStore } from "@/stores/useAuthStore";
import { useStreamStore } from "@/stores/useStreamStore";
import ReactionStats from "@/components/stream/ReactionStat";
import LiveBadge from "@/components/home/LiveBadge";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import ChatBox from "@/components/chat/ChatBox";

import { LiveKitRoom, VideoConference } from "@livekit/components-react";
import type { Stream } from "@/types/stream";
import { streamService } from "@/services/streamService";


export default function DashboardPage() {
  const { user } = useAuthStore();
  const [stream, setStream] = useState<Stream | null>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ title: "", description: "" });
  const [token, setToken] = useState<string | null>(null);

  // Lấy thông tin buổi stream hiện tại
   useEffect(() => {
     const fetchStream = async () => {
       try {
         // Lấy luồng phát trực tiếp hiện tại của user
         const streams = await streamService.listLive();
         const myStream = streams.find(
           (s: Stream) => s.streamerId === user?._id && s.status === "LIVE"
         );

         if (myStream) {
           setStream(myStream);
           setForm({
             title: myStream.title || "",
             description: myStream.description || "",
           });
         }
       } catch (err) {
         console.error("fetchStream error:", err);
       } finally {
         setLoading(false);
       }
     };
     fetchStream();
   }, [user]);

  // Lấy LiveKit token cho preview (host)
  useEffect(() => {
    const fetchToken = async () => {
      if (!stream || !user) return;
      try {
        const token = await streamService.getPublisherToken(stream.streamId);
        setToken(token);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (err: any) {
        console.error("get token error:", err);
        toast.error(
          err.response?.data?.message || "Không thể lấy token LiveKit"
        );
      }
    };

    fetchToken();
  }, [stream, user]);

  const handleUpdate = async () => {
    try {
      if (!stream) return;

      // Cập nhật stream metadata
      const { data } = await api.patch(`/streams/${stream.streamId}`, form);
      if (data.success) {
        toast.success("Cập nhật thành công!");
        setStream(data.stream);
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Lỗi khi cập nhật");
    }
  };

  const handleEnd = async () => {
    if (!stream) return;
    try {
      await streamService.end(stream.streamId);
      toast.success("Đã kết thúc buổi stream");
      setStream(null);
    } catch {
      toast.error("Không thể kết thúc stream");
    }
  };

  const { viewerCount } = useStreamStore(
    stream?.roomName || "",
    user?.username || "guest",
    user?._id
  );

  // ------------------ UI ------------------

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0b0f1a] text-slate-300">
        Đang tải thông tin stream...
      </div>
    );
  }

  if (!stream) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0b0f1a] text-white">
        <h1 className="text-2xl font-semibold mb-3">Chưa có buổi phát nào</h1>
        <p className="text-slate-400">
          Hãy bắt đầu live tại <strong>Keys Page</strong>.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0f1a] text-white p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          Creator Dashboard
          <LiveBadge live={stream?.status === "LIVE"} />
        </h1>
        {stream?.status === "LIVE" && (
          <Button variant="destructive" onClick={handleEnd}>
            End Stream
          </Button>
        )}
      </div>

      <Separator className="bg-white/10 mb-4" />

      <div className="grid grid-cols-[minmax(0,2fr)_minmax(320px,1fr)] gap-6">
        <div className="space-y-4">
          {/* Video Preview */}
          <div className="aspect-video rounded-xl border border-white/10 bg-black overflow-hidden">
            {token ? (
              <LiveKitRoom
                token={token}
                serverUrl={import.meta.env.VITE_LIVEKIT_URL}
                connect={true}
                audio={true}
                video={true}
                onConnected={() => {
                  console.log("✅ Connected to LiveKit room");
                  toast.success("Đã kết nối tới phòng live!");
                }}
                onDisconnected={() => {
                  console.log("🔌 Disconnected from LiveKit room");
                  toast.info("Đã ngắt kết nối");
                }}
                onError={(error) => {
                  console.error("LiveKit error:", error);
                  toast.error("Lỗi kết nối: " + error.message);
                }}
              >
                <VideoConference />
              </LiveKitRoom>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm">
                Đang tạo kết nối xem trước LiveKit...
              </div>
            )}
          </div>

          {/* Title */}
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-sm">Tiêu đề</CardTitle>
              <CardDescription>
                Streamer có thể chỉnh sửa tiêu đề buổi phát
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                value={form.title}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, title: e.target.value }))
                }
                className="bg-transparent border-white/10 text-white"
                placeholder="Tiêu đề buổi stream"
              />
            </CardContent>
          </Card>

          {/* Description */}
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-sm">Mô tả / Bio</CardTitle>
              <CardDescription>
                Mô tả nội dung, chủ đề, link liên quan, v.v.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                value={form.description}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                className="bg-transparent border-white/10 text-white min-h-[120px]"
                placeholder="Mô tả / Bio"
              />
              <div className="flex justify-end">
                <Button onClick={handleUpdate} className="bg-purple-600">
                  Lưu thay đổi
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          {/* Viewer Count */}
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-sm">Viewer Count</CardTitle>
              <CardDescription>
                Cập nhật theo thời gian thực qua Socket.IO
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-center">{viewerCount}</p>
            </CardContent>
          </Card>

          {/* Reaction stats */}
          {stream._id && <ReactionStats streamId={stream._id} />}

          {/* Chat */}
          <Card className="flex flex-col bg-white/5 border-white/10 h-80">
            <CardHeader>
              <CardTitle className="text-sm">Chat</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 min-h-0">
              <ChatBox streamId={stream.streamId} roomName={stream.roomName} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}