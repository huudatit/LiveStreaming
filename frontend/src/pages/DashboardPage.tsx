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
import { Video, VideoOff } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export default function DashboardPage() {
  const { user } = useAuthStore();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [stream, setStream] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ title: "", description: "" });
  const [token, setToken] = useState<string | null>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [vodId, setVodId] = useState<string | null>(null);

  // Dialog tạo stream mới
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEndStreamDialog, setShowEndStreamDialog] = useState(false);
  const [createForm, setCreateForm] = useState({
    title: "",
    description: "",
  });

  // Lấy thông tin stream hiện tại
  const fetchStream = async () => {
    try {
      // Kiểm tra user trước khi gọi API
      if (!user) {
        console.log("User chưa đăng nhập");
        setLoading(false);
        return;
      }

      const { data } = await api.get("/streams/me/live");
      console.log("📊 /streams/me/live response:", data);
      
      if (data?.streamId && data.roomName) {
        const streamRes = await api.get(`/streams/${data.streamId}`);
        console.log("📊 Stream data:", streamRes.data.stream);
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

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let timer: any;

    fetchStream();
    timer = setInterval(fetchStream, 5000);
    return () => clearInterval(timer);
  }, [user]);



  // Start recording
  const handleStartRecording = async () => {
    if (!stream) return;

    try {
      const { data } = await api.post("/vod/start", {
        streamId: stream._id,
        roomName: stream.roomName,
      });

      if (data.success) {
        setIsRecording(true);
        setVodId(data.vod.vodId);
        toast.success("Đã bắt đầu quay video!");
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error("Start recording error:", error);
      toast.error(
        error.response?.data?.message || "Không thể bắt đầu quay video"
      );
    }
  };

  // Stop recording
  const handleStopRecording = async () => {
    if (!vodId) return;

    try {
      const { data } = await api.post("/vod/stop", { vodId });

      if (data.success) {
        setIsRecording(false);
        toast.success("Đã dừng quay video! Video đang được xử lý.");
        setVodId(null);
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error("Stop recording error:", error);
      toast.error(error.response?.data?.message || "Không thể dừng quay video");
    }
  };

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
      
      // Always use _id for updates to avoid confusion
      console.log("🔄 Updating stream with _id:", stream._id);
      console.log("🔄 Form data:", form);
      
      const { data } = await api.patch(`/streams/${stream._id}`, form);
      if (data.success) {
        toast.success("Cập nhật thành công!");
        setStream(data.stream);
        setForm({
          title: data.stream.title,
          description: data.stream.description || "",
        });
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      console.error("❌ Update error:", err.response?.data || err.message);
      toast.error(err.response?.data?.message || "Lỗi khi cập nhật");
    }
  };

  // Kết thúc stream
  const handleEndStream = async () => {
    if (!stream) return;

    try {
      // Stop recording first if recording
      if (isRecording && vodId) {
        await handleStopRecording();
      }

      const streamIdentifier = stream._id;
      console.log("🛑 Ending stream with _id:", streamIdentifier);
      const { data } = await api.post(`/streams/${streamIdentifier}/end`);

      if (data.success) {
        toast.success("Đã kết thúc buổi stream");
        setStream(null);
        setToken(null);
        setShowEndStreamDialog(false);
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error("End stream error:", error);
      toast.error(error.response?.data?.message || "Không thể kết thúc stream");
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
  console.log("🎯 Dashboard render - stream state:", {
    hasStream: !!stream,
    isLive: stream?.isLive,
    status: stream?.status,
    roomName: stream?.roomName,
    _id: stream?._id,
  });

  return (
    <div className="min-h-screen bg-[#0b0f1a] text-white">
      {/* Container chính: Đảm bảo padding đồng nhất và giới hạn chiều rộng */}
      <div className="mx-auto w-full max-w-7xl p-4 lg:p-6 space-y-6">
        {/* 1. Header Section: Sử dụng flex-col trên mobile và flex-row trên desktop */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
              Creator Dashboard
              <LiveBadge live={stream?.isLive} />
            </h1>
            <p className="text-sm text-slate-400">
              Quản lý buổi phát sóng và tương tác với người xem
            </p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {/* Nút Go Live (khi đang preparing) */}
            {stream && !stream.isLive && (
              <Button
                onClick={async () => {
                  try {
                    const { data } = await api.patch(`/streams/${stream._id}`, {
                      isLive: true,
                      status: 'live',
                    });
                    if (data.success) {
                      toast.success("Đã chuyển sang trạng thái LIVE!");
                      // Immediately refresh stream data
                      await fetchStream();
                    }
                  } catch (err: any) {
                    console.error("❌ Go Live error:", err.response?.data || err.message);
                    toast.error("Không thể chuyển sang LIVE");
                  }
                }}
                className="bg-green-600 hover:bg-green-700 flex-1 sm:flex-none"
              >
                🎬 Go Live
              </Button>
            )}

            {/* Nút Quay phim */}
            {stream && (
              <Button
                onClick={
                  isRecording ? handleStopRecording : handleStartRecording
                }
                variant={isRecording ? "destructive" : "secondary"}
                className="flex-1 sm:flex-none gap-2"
              >
                {isRecording ? (
                  <>
                    <VideoOff className="size-4 animate-pulse" />
                    Dừng quay
                  </>
                ) : (
                  <>
                    <Video className="size-4" />
                    Bắt đầu quay
                  </>
                )}
              </Button>
            )}

            {/* Nút Kết thúc Stream */}
            {stream && (
              <Button
                variant="destructive"
                onClick={() => setShowEndStreamDialog(true)}
                className="flex-1 sm:flex-none"
              >
                End Stream
              </Button>
            )}
          </div>
        </div>

        <Separator className="bg-white/10" />

        {/* 2. Main Layout Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-6 items-start">
          {/* --- CỘT TRÁI: Video Preview & Settings --- */}
          <div className="space-y-6">
            {/* Preview LiveKit: Tỉ lệ 16:9 chuẩn */}
            <div className="relative aspect-video rounded-2xl border border-white/10 bg-black overflow-hidden shadow-2xl">
              {token ? (
                <LiveKitRoom
                  token={token}
                  serverUrl={import.meta.env.VITE_LIVEKIT_URL}
                  connect={true}
                  audio={true}
                  video={true}
                  onConnected={() => toast.success("Đã kết nối preview!")}
                >
                  <VideoConference />
                </LiveKitRoom>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 gap-3">
                  <div className="size-10 border-4 border-t-purple-500 border-white/10 rounded-full animate-spin" />
                  <p className="text-sm">Đang thiết lập kết nối...</p>
                </div>
              )}
            </div>

            {/* Trạng thái ghi hình: Nổi bật hơn */}
            {isRecording && (
              <Card className="bg-red-500/5 border-red-500/20 overflow-hidden">
                <div className="h-1 bg-red-500 w-full animate-pulse" />
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="size-3 bg-red-500 rounded-full animate-ping" />
                  <div>
                    <p className="font-semibold text-red-400">
                      Đang lưu bản ghi (VOD)
                    </p>
                    <p className="text-xs text-slate-400">
                      Video sẽ khả dụng trong thư viện sau khi kết thúc buổi
                      live.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Thông tin Stream */}
            <Card className="bg-white/5 border-white/10 shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg font-medium">
                  Chi tiết buổi phát
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase text-slate-500 ml-1">
                    Tiêu đề
                  </label>
                  <Input
                    value={form.title}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, title: e.target.value }))
                    }
                    className="bg-black/20 border-white/10 focus:border-purple-500 transition-all"
                    placeholder="Nhập tiêu đề hấp dẫn..."
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase text-slate-500 ml-1">
                    Mô tả
                  </label>
                  <Textarea
                    value={form.description}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, description: e.target.value }))
                    }
                    className="bg-black/20 border-white/10 focus:border-purple-500 min-h-[120px] resize-none"
                    placeholder="Kể cho người xem về nội dung hôm nay..."
                  />
                </div>
                <Button
                  onClick={handleUpdate}
                  className="bg-purple-600 hover:bg-purple-700 w-full font-bold shadow-lg shadow-purple-900/20"
                >
                  Cập nhật thông tin
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* --- CỘT PHẢI: Stats & Chat (Sticky) --- */}
          <aside className="xl:sticky xl:top-6 space-y-6 flex flex-col h-fit">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 gap-4">
              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-4 text-center">
                  <p className="text-xs font-medium text-slate-400 uppercase mb-1">
                    Người xem
                  </p>
                  <p className="text-3xl font-bold">{viewerCount}</p>
                </CardContent>
              </Card>
              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-4 text-center">
                  <p className="text-xs font-medium text-slate-400 uppercase mb-1">
                    Cảm xúc
                  </p>
                  <p className="text-3xl font-bold text-slate-300">—</p>
                </CardContent>
              </Card>
            </div>

            {/* Reaction Stats */}
            {stream._id && <ReactionStats streamId={stream._id} />}

            {/* ChatBox: Giới hạn chiều cao để không đẩy page */}
            <Card className="bg-white/5 border-white/10 flex flex-col overflow-hidden h-[500px] xl:h-[calc(100vh-420px)]">
              <CardHeader className="p-4 border-b border-white/10 bg-white/5">
                <CardTitle className="text-sm font-bold uppercase tracking-widest text-slate-400">
                  Trò chuyện trực tiếp
                </CardTitle>
              </CardHeader>
              <div className="flex-1 overflow-hidden">
                <ChatBox streamId={stream._id} roomName={stream.roomName} />
              </div>
            </Card>
          </aside>
        </div>
      </div>

      {/* AlertDialog: Nên đặt ngoài cùng để tránh lỗi z-index/stacking context */}
      <AlertDialog
        open={showEndStreamDialog}
        onOpenChange={setShowEndStreamDialog}
      >
        <AlertDialogContent className="bg-[#0b0f1a]/95 backdrop-blur-xl border border-white/10 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl">
              Kết thúc livestream?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Hành động này sẽ ngắt kết nối với tất cả người xem.
              {isRecording && (
                <span className="block mt-2 text-red-400">
                  Lưu ý: Hệ thống sẽ tự động hoàn tất quá trình lưu video bản
                  ghi.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white/5 hover:bg-white/10 border-white/10">
              Hủy
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleEndStream}
              className="bg-red-600 hover:bg-red-700"
            >
              Xác nhận kết thúc
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}