/* eslint-disable prefer-const */
import { useEffect, useState } from "react";
import { api } from "@/lib/axios";
import { toast } from "sonner";
import { useAuthStore } from "@/stores/useAuthStore";
import { useStreamStore } from "@/stores/useStreamStore";
import { socket } from "@/services/socket";
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
// 1. Thêm icon Radio
import { Video, VideoOff, Radio } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useNavigate } from "react-router-dom";

export default function DashboardPage() {
  const { user } = useAuthStore();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [stream, setStream] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ title: "", description: "" });
  const [token, setToken] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  const [isRecording, setIsRecording] = useState(false);
  const [vodId, setVodId] = useState<string | null>(null);

  // Reaction count for real-time updates
  const [reactionCount, setReactionCount] = useState(0);

  // Dialog tạo stream mới
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEndStreamDialog, setShowEndStreamDialog] = useState(false);
  const [createForm, setCreateForm] = useState({
    title: "",
    description: "",
  });

  const navigate = useNavigate();

  // Lấy thông tin stream hiện tại
  const fetchStream = async () => {
    try {
      if (!user) {
        console.log("User chưa đăng nhập");
        setLoading(false);
        return;
      }

      const { data } = await api.get("/streams/me/live");

      if (data?.streamId && data.roomName) {
        const streamRes = await api.get(`/streams/${data.streamId}`);
        setStream(streamRes.data.stream);
        // Chỉ cập nhật form nếu người dùng chưa đang gõ (để tránh overwrite)
        // Ở đây mình set luôn cho đơn giản
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
        toast.error("Phiên đăng nhập đã hết hạn.");
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

  // ============================================
  // 2. HÀM KÍCH HOẠT GO LIVE (MỚI)
  // ============================================
  const handleGoLive = async () => {
    if (!stream?._id || starting ) return;
    try {
      setStarting(true);

      const { data } = await api.post(`/streams/${stream._id}/start`);
      if (data.success) {
        toast.success("🚀 Đã lên sóng thành công! User khác có thể thấy bạn.");
        // Cập nhật ngay state local để giao diện đổi ngay lập tức
        setStream({ ...stream, isLive: true, status: "live" });
      }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Lỗi khi kích hoạt stream");
    }
  };

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
    } finally {
      setStarting(false);
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
        navigate("/keys");
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
      toast.error(err.response?.data?.message || "Lỗi khi cập nhật");
    }
  };

  // Kết thúc stream
  const handleEndStream = async () => {
    if (!stream) return;
    try {
      if (isRecording && vodId) {
        await handleStopRecording();
      }
      const { data } = await api.post(`/streams/${stream._id}/end`);
      if (data.success) {
        toast.success("Đã kết thúc buổi stream");
        setStream(null);
        setToken(null);
        setShowEndStreamDialog(false);
      }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Không thể kết thúc stream");
    }
  };

  const shouldConnect = !!token && stream?.status === "live";

  const { viewerCount } = useStreamStore(
    stream?.roomName || "",
    user?.username || "guest",
    user?._id
  );

  // Reaction socket listener
  useEffect(() => {
    if (!stream?._id) return;
    const handleReactionStatsUpdate = (data: {
      streamId: string;
      total: number;
    }) => {
      if (data.streamId === stream._id) {
        setReactionCount(data.total);
      }
    };
    socket.on("reaction-stats-updated", handleReactionStatsUpdate);

    // Initial fetch
    api
      .get(`/reactions/stats/${stream._id}`)
      .then(({ data }) => {
        if (data.success) setReactionCount(data.total);
      })
      .catch(console.error);

    return () => {
      socket.off("reaction-stats-updated", handleReactionStatsUpdate);
    };
  }, [stream?._id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0b0f1a] text-slate-300">
        Loading stream information...
      </div>
    );
  }

  // Màn hình tạo stream (khi chưa có stream)
  if (!stream) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0b0f1a] text-white p-6">
        <Card className="bg-white/5 border-white/10 p-8 max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-2xl text-center text-white">
              There have been no broadcasts yet.
            </CardTitle>
            <CardDescription className="text-center">
              Start your livestream now!
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center pt-4">
            <Button
              onClick={() => setShowCreateDialog(true)}
              className="bg-purple-600 hover:bg-purple-700"
              size="lg"
            >
              Create New Stream
            </Button>
          </CardContent>
        </Card>

        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="bg-[#0b0f1a]/95 backdrop-blur-lg border border-white/10 text-white">
            <DialogHeader>
              <DialogTitle>Create New Stream</DialogTitle>
              <DialogDescription>
                Enter the information for your livestream.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Stream title *
                </label>
                <Input
                  placeholder=""
                  value={createForm.title}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, title: e.target.value })
                  }
                  className="bg-black/40 border-white/10"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Description (optional)
                </label>
                <Textarea
                  placeholder="Description of the stream content..."
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
                className="bg-black hover:bg-white hover:text-purple-700 cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateStream}
                className="bg-purple-600 hover:bg-purple-700 cursor-pointer"
              >
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ===========================================
  // UI DASHBOARD CHÍNH
  // ===========================================
  return (
    <div className="min-h-screen bg-[#0b0f1a] text-white">
      <div className="mx-auto w-full max-w-7xl p-4 lg:p-6 space-y-6">
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
              Creator Dashboard
              <LiveBadge live={stream?.isLive} />
            </h1>
            <p className="text-sm text-slate-400">
              Manage the broadcast and interact with viewers.
            </p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {/* Nút Quay phim */}
            {stream && (
              <Button
                onClick={
                  isRecording ? handleStopRecording : handleStartRecording
                }
                variant={isRecording ? "destructive" : "secondary"}
                className="flex-1 sm:flex-none gap-2 bg-white"
              >
                {isRecording ? (
                  <>
                    <VideoOff className="size-4 animate-pulse" /> End recording
                  </>
                ) : (
                  <>
                    <Video className="size-4" /> Start recording
                  </>
                )}
              </Button>
            )}

            {/* ======================================================== */}
            {/* 3. NÚT GO LIVE HOẶC END STREAM */}
            {/* ======================================================== */}
            {stream && !stream.isLive ? (
              // NÚT GO LIVE: Chỉ hiện khi chưa Live
              <Button
                onClick={handleGoLive}
                className="bg-red-600 hover:bg-red-700 flex-1 sm:flex-none gap-2 font-bold"
              >
                <Radio className="size-4" />
                Go Live
              </Button>
            ) : (
              // NÚT END STREAM: Hiện khi Đang Live
              <Button
                variant="destructive"
                onClick={() => setShowEndStreamDialog(true)}
                className="flex-1 sm:flex-none"
              >
                End Stream
              </Button>
            )}
            {/* ======================================================== */}
          </div>
        </div>

        <Separator className="bg-white/10" />

        {/* MAIN GRID */}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-6 items-start">
          {/* CỘT TRÁI */}
          <div className="space-y-6">
            {/* LiveKit Preview */}
            <div className="relative aspect-video rounded-2xl border border-white/10 bg-black overflow-hidden shadow-2xl">
              {shouldConnect ? (
                <LiveKitRoom
                  token={token}
                  serverUrl={import.meta.env.VITE_LIVEKIT_URL}
                  connect={true}
                  audio={true}
                  video={true}
                >
                  <VideoConference />
                </LiveKitRoom>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 gap-3">
                  <div className="size-10 border-4 border-t-purple-500 border-white/10 rounded-full animate-spin" />
                  <p className="text-sm">Establishing a connection...</p>
                </div>
              )}
            </div>

            {/* Recording Alert */}
            {isRecording && (
              <Card className="bg-red-500/5 border-red-500/20 overflow-hidden">
                <div className="h-1 bg-red-500 w-full animate-pulse" />
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="size-3 bg-red-500 rounded-full animate-ping" />
                  <div>
                    <p className="font-semibold text-red-400">
                      Saving a record (VOD)
                    </p>
                    <p className="text-xs text-slate-400">
                      The video will be available after the live stream ends.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Stream Settings */}
            <Card className="bg-white/5 border-white/10 shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg text-white font-medium">
                  Detail of the stream
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs text-white font-semibold uppercase ml-1">
                    Title
                  </label>
                  <Input
                    value={form.title}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, title: e.target.value }))
                    }
                    className="bg-black/20 border-white/10 focus:border-purple-500 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase text-white ml-1">
                    Describe
                  </label>
                  <Textarea
                    value={form.description}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, description: e.target.value }))
                    }
                    className="bg-black/20 border-white/10 focus:border-purple-500 min-h-[120px] resize-none text-white"
                  />
                </div>
                <Button
                  onClick={handleUpdate}
                  className="bg-purple-600 hover:bg-purple-700 w-full font-bold"
                >
                  Update
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* CỘT PHẢI */}
          <aside className="xl:sticky xl:top-6 space-y-6 flex flex-col h-fit">
            <div className="grid grid-cols-2 gap-4">
              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-4 text-center">
                  <p className="text-xs font-medium text-white uppercase mb-1">
                    Watching
                  </p>
                  <p className="text-3xl font-bold text-white">{viewerCount}</p>
                </CardContent>
              </Card>
              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-4 text-center">
                  <p className="text-xs font-medium text-white uppercase mb-1">
                    Reactions
                  </p>
                  <p className="text-3xl font-bold text-white">
                    {reactionCount}
                  </p>
                </CardContent>
              </Card>
            </div>

            {stream._id && <ReactionStats streamId={stream._id} />}

            <Card className="bg-white/5 border-white/10 flex flex-col overflow-hidden h-[650px]">
              <div className="flex-1 overflow-hidden h-full min-h-0">
                <ChatBox streamId={stream._id} roomName={stream.roomName} />
              </div>
            </Card>
          </aside>
        </div>
      </div>

      <AlertDialog
        open={showEndStreamDialog}
        onOpenChange={setShowEndStreamDialog}
      >
        <AlertDialogContent className="bg-[#0b0f1a]/95 backdrop-blur-xl border border-white/10 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl">
              End livestream?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              This action will disconnect all viewers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white/5 hover:bg-white/10 border-white/10">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleEndStream}
              className="bg-red-600 hover:bg-red-700"
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
