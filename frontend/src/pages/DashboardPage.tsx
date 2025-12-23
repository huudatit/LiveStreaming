/* eslint-disable prefer-const */
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

import { LiveKitRoom, VideoConference } from "@livekit/components-react";

export default function DashboardPage() {
  const { user } = useAuthStore();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [stream, setStream] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ title: "", description: "" });
  const [token, setToken] = useState<string | null>(null);

  // Dialog tạo stream mới
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createForm, setCreateForm] = useState({
    title: "",
    description: "",
  });

  // Lấy thông tin stream hiện tại
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let timer: any;

    const fetchStream = async () => {
      try {
        // Kiểm tra user trước khi gọi API
        if (!user) {
          console.log("User chưa đăng nhập");
          setLoading(false);
          return;
        }

        const { data } = await api.get("/streams/me/live");
        if (data?.streamId && data.roomName) {
          const streamRes = await api.get(`/streams/${data.streamId}`);
          setStream(streamRes.data.stream);
          setForm({
            title: streamRes.data.stream.title || "",
            description: streamRes.data.stream.description || "",
          });
        } else {
          setStream(null);

        }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (error: any) {
        console.error("Fetch stream error: ", error);
        if (error.response?.status === 401) {
          toast.error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại!");
        }
      } finally {
        setLoading(false);
      }
    };
  fetchStream();
  timer = setInterval(fetchStream, 3000);
  return () => clearInterval(timer);
  }, [user]);

  // Lấy token LiveKit
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

  // Tạo stream mới
  const handleCreateStream = async () => {
    try {
      if (!createForm.title.trim()) {
        toast.error("Vui lòng nhập tiêu đề stream!");
        return;
      }

      const { data } = await api.post("/streams/create", createForm);

      if (data.success) {
        toast.success("Tạo stream thành công!");
        setStream(data.stream);
        setForm({
          title: data.stream.title,
          description: data.stream.description || "",
        });
        setShowCreateDialog(false);
        setCreateForm({ title: "", description: "" });
      }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Không thể tạo stream");
    }
  };

  // Cập nhật thông tin stream
  const handleUpdate = async () => {
    try {
      if (!stream) return;
      const { data } = await api.patch(`/streams/${stream.roomName}`, form);
      if (data.success) {
        toast.success("Cập nhật thành công!");
        setStream(data.stream);
      }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Lỗi khi cập nhật");
    }
  };

  // Kết thúc stream
  const handleEnd = async () => {
    if (!stream) return;
    try {
      await api.post(`/streams/${stream.roomName}/end`);
      toast.success("Đã kết thúc buổi stream");
      setStream(null);
      setToken(null);
    } catch {
      toast.error("Không thể kết thúc stream");
    }
  };

  const { viewerCount } = useStreamStore(
    stream?.roomName || "",
    user?.username || "guest",
    user?._id
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0b0f1a] text-slate-300">
        Đang tải thông tin stream...
      </div>
    );
  }

  // Nếu chưa có stream -> hiển thị nút tạo stream
  if (!stream) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0b0f1a] text-white p-6">
        <Card className="bg-white/5 border-white/10 p-8 max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-2xl text-center text-white">
              Chưa có buổi phát nào
            </CardTitle>
            <CardDescription className="text-center">
              Bắt đầu livestream của bạn ngay bây giờ!
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center pt-4">
            <Button
              onClick={() => setShowCreateDialog(true)}
              className="bg-purple-600 hover:bg-purple-700"
              size="lg"
            >
              Tạo Stream Mới
            </Button>
          </CardContent>
        </Card>

        {/* Dialog tạo stream */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="bg-[#0b0f1a]/95 backdrop-blur-lg border border-white/10 text-white">
            <DialogHeader>
              <DialogTitle>Tạo Stream Mới</DialogTitle>
              <DialogDescription>
                Nhập thông tin cho buổi livestream của bạn
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Tiêu đề stream *
                </label>
                <Input
                  placeholder="Ví dụ: Chơi game cùng mọi người"
                  value={createForm.title}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, title: e.target.value })
                  }
                  className="bg-black/40 border-white/10"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">
                  Mô tả (tùy chọn)
                </label>
                <Textarea
                  placeholder="Mô tả về nội dung stream..."
                  value={createForm.description}
                  onChange={(e) =>
                    setCreateForm({
                      ...createForm,
                      description: e.target.value,
                    })
                  }
                  className="bg-black/40 border-white/10 min-h-[100px]"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowCreateDialog(false)}
                className="bg-black hover:bg-white hover:text-purple-700"
              >
                Hủy
              </Button>
              <Button
                onClick={handleCreateStream}
                className="bg-purple-600 hover:bg-purple-700"
              >
                Tạo Stream
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Dashboard khi đã có stream
  return (
    <div className="min-h-screen bg-[#0b0f1a] text-white">
      <div className="mx-auto w-full max-w-7xl p-4 lg:p-6">
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

        <Separator className="bg-white/10 mb-6" />

        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,2fr)_minmax(360px,1fr)] gap-6 items-start">
          {/* Cột trái */}
          <div className="space-y-4">
            {/* Preview LiveKit */}
            <div className="rounded-xl border border-white/10 bg-black overflow-hidden h-[min(56vh,520px)]">
              {token ? (
                <LiveKitRoom
                  token={token}
                  serverUrl={import.meta.env.VITE_LIVEKIT_URL}
                  connect={true}
                  audio={true}
                  video={true}
                  onConnected={() =>
                    toast.success("Đã kết nối tới phòng live!")
                  }
                >
                  <VideoConference />
                </LiveKitRoom>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm">
                  Đang tạo kết nối xem trước LiveKit...
                </div>
              )}
            </div>

            {/* Form tiêu đề */}
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-sm text-white">
                  Thông tin stream
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input
                  value={form.title}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, title: e.target.value }))
                  }
                  className="bg-transparent border-white/10 text-white"
                  placeholder="Tiêu đề buổi stream"
                />
                <Textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, description: e.target.value }))
                  }
                  className="bg-transparent border-white/10 text-white min-h-[120px]"
                  placeholder="Mô tả về stream..."
                />
                <Button onClick={handleUpdate} className="bg-purple-600 w-full">
                  Lưu thay đổi
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Cột phải */}
          <div className="xl:sticky xl:top-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Card className="bg-white/5 border-white/10">
                <CardHeader>
                  <CardTitle className="text-sm text-white text-center">Người xem</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-center text-white">
                    {viewerCount}
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-white/5 border-white/10">
                <CardHeader>
                  <CardTitle className="text-sm text-white text-center">Reaction</CardTitle>
                </CardHeader>
                <CardContent className="text-center text-slate-300">
                  {/* hoặc total reactions */}—
                </CardContent>
              </Card>
            </div>

            {/* Reaction stats */}
            {stream._id && <ReactionStats streamId={stream._id} />}

            {/* Chat */}
            <div className="h-full overflow-y-auto">
              <ChatBox streamId={stream._id} roomName={stream.roomName} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}