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

type ActivityEvent = {
  id: string;
  message: string;
};

export default function DashboardPage() {
  const { user } = useAuthStore();

  // Trạng thái stream hiện tại (tạm dùng any, có thể thay bằng type Stream sau)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [stream, setStream] = useState<any>(null);

  // Trạng thái tải dữ liệu ban đầu (loading)
  const [loading, setLoading] = useState(true);

  // Form chỉnh sửa tiêu đề và mô tả của buổi stream
  const [form, setForm] = useState({ title: "", description: "" });

  // Token LiveKit dùng cho preview (host)
  const [token, setToken] = useState<string | null>(null);

  // Danh sách sự kiện hoạt động (dự kiến sẽ đổ dữ liệu real-time qua Socket.IO)
  const [events] = useState<ActivityEvent[]>([]);

  // Lấy thông tin buổi stream live hiện tại của user (nếu có)
  useEffect(() => {
    const fetchStream = async () => {
      try {
        const { data } = await api.get("/streams/me/live");
        if (data?.live && data.room) {
          const streamRes = await api.get(`/streams/${data.room}`);
          setStream(streamRes.data.stream);
          setForm({
            title: streamRes.data.stream.title || "",
            description: streamRes.data.stream.description || "",
          });
        }
      } catch (err) {
        console.error("fetchStream error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchStream();
  }, []);

  // Lấy LiveKit token để streamer (host) có thể xem trước / join vào phòng LiveKit
  useEffect(() => {
    const fetchToken = async () => {
      if (!stream || !user) return;
      try {
        const { data } = await api.post("/livekit/token", {
          roomName: stream.streamId || stream.roomName,
          username: user.username,
          role: "host",
        });

        if (data?.token) {
          setToken(data.token);
        } else if (data?.success === false) {
          console.warn("Không lấy được token:", data.message);
        }
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

  // Cập nhật tiêu đề + mô tả của buổi stream
  const handleUpdate = async () => {
    try {
      if (!stream) return;
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

  // Kết thúc buổi stream
  const handleEnd = async () => {
    if (!stream) return;
    try {
      await api.post(`/streams/${stream.streamId}/end`);
      toast.success("Đã kết thúc buổi stream");
      setStream({ ...stream, isLive: false, status: "ended" });
    } catch {
      toast.error("Không thể kết thúc stream");
    }
  };

  // Lấy số lượng người xem theo thời gian thực (qua store/socket)
  const { viewerCount } = useStreamStore(
    stream?.roomName || "",
    user?.username || "guest",
    user?._id
  );

  // ------------------ Giao diện ------------------

  // Màn hình loading khi đang tải dữ liệu
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0b0f1a] text-slate-300">
        Đang tải thông tin stream...
      </div>
    );
  }

  // Trường hợp user chưa có buổi stream live nào
  if (!stream) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0b0f1a] text-white">
        <h1 className="text-2xl font-semibold mb-3">Chưa có buổi phát nào</h1>
        <p className="text-slate-400">
          Hãy bắt đầu live tại <strong>Streamer Dashboard</strong>.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0f1a] text-white p-6">
      {/* Thanh tiêu đề: tên trang + trạng thái live */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          Creator Dashboard
          <LiveBadge live={stream?.isLive} />
        </h1>
        {stream?.isLive && (
          <Button variant="destructive" onClick={handleEnd}>
            End Stream
          </Button>
        )}
      </div>

      <Separator className="bg-white/10 mb-4" />

      {/* Layout 2 cột: bên trái (preview + form), bên phải (stats + chat + activity) */}
      <div className="grid grid-cols-[minmax(0,2fr)_minmax(320px,1fr)] gap-6">
        {/* Cột trái: preview LiveKit + form chỉnh sửa */}
        <div className="space-y-4">
          {/* Khung preview (LiveKit host view) */}
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
                  console.error("❌ LiveKit error:", error);
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

          {/* Form chỉnh sửa tiêu đề */}
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

          {/* Form chỉnh sửa mô tả / bio */}
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

        {/* Cột phải: thống kê + chat + activity + nút end */}
        <div className="space-y-4">
          {/* Thống kê: số người xem */}
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

          {/* Thống kê reactions */}
          {stream._id && <ReactionStats streamId={stream._id} />}

          {/* Khung chat với người xem */}
          <Card className="flex flex-col bg-white/5 border-white/10 h-80">
            <CardHeader>
              <CardTitle className="text-sm">Chat</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 min-h-0">
              <ChatBox streamId={stream._id} roomName={stream.roomName} />
            </CardContent>
          </Card>

          {/* Danh sách hoạt động người xem (event feed) */}
          <Card className="bg-white/5 border-white/10 h-40 overflow-y-auto">
            <CardHeader>
              <CardTitle className="text-sm">Viewer activity</CardTitle>
              <CardDescription className="text-xs">
                (Sẽ hiển thị log khi nối thêm sự kiện từ Socket.IO)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-1 text-xs text-slate-300">
              {events.length === 0 && (
                <p className="text-slate-500">
                  Chưa có hoạt động nào được ghi lại.
                </p>
              )}
              {events.map((ev) => (
                <div key={ev.id}>{ev.message}</div>
              ))}
            </CardContent>
          </Card>

          {/* Nút kết thúc stream (đặt thêm để đúng layout bên phải) */}
          {stream?.isLive && (
            <Button
              variant="destructive"
              className="w-full"
              onClick={handleEnd}
            >
              End Stream
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}