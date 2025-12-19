// src/pages/KeysPage.tsx
import { useState, useTransition } from "react";
import { Copy, Eye, EyeOff, Play } from "lucide-react";
import { api } from "@/lib/axios";
import { useAuthStore } from "@/stores/useAuthStore";
import { streamService } from "@/services/streamService";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function KeysPage() {
  const navigate = useNavigate();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [startStreamOpen, setStartStreamOpen] = useState(false);

  const [serverUrl, setServerUrl] = useState("");
  const [streamKey, setStreamKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [ingressType, setIngressType] = useState("RTMP_INPUT");

  // Form tạo luồng stream
  const [streamForm, setStreamForm] = useState({
    title: "",
    description: "",
  });

  const { user } = useAuthStore();

  // Gọi API backend tạo ingress (RTMP/WHIP)
  const handleGenerate = async () => {
    if (!user) {
      toast.error("Bạn cần đăng nhập trước!");
      return;
    }

    startTransition(async () => {
      try {
        const res = await api.post("/livekit/ingress", {
          userId: user._id,
          type: ingressType,
        });

        if (res.data.success) {
          const { streamUrl, streamKey } = res.data.ingress;
          setServerUrl(streamUrl);
          setStreamKey(streamKey);
          toast.success("Tạo ingress thành công!");
          setOpen(false);
        } else {
          toast.error(res.data.message || "Không thể tạo ingress");
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (err: any) {
        console.error("Lỗi:", err);
        toast.error(err.response?.data?.message || "Lỗi server!");
      }
    });
  };

  // Bắt đầu live stream
  const handleStartStream = async () => {
    if (!streamForm.title.trim()) {
      toast.error("Vui lòng nhập tiêu đề stream!");
      return;
    }

    try {
      const response = await streamService.start({
        title: streamForm.title,
        description: streamForm.description,
      });

      if (response.success) {
        toast.success("Đã bắt đầu stream!");
        setStartStreamOpen(false);
        navigate("/dashboard");
      }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Không thể bắt đầu stream");
    }
  };

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Đã sao chép vào bộ nhớ tạm!");
    } catch {
      toast.error("Sao chép thất bại!");
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Keys & URLs</h1>
        <div className="flex gap-2">
          {/* Nút bắt đầu live */}
          <Dialog open={startStreamOpen} onOpenChange={setStartStreamOpen}>
            <DialogTrigger asChild>
              <Button className="bg-green-600 hover:bg-green-700 text-white">
                <Play className="size-4 mr-2" />
                Start Stream
              </Button>
            </DialogTrigger>

            <DialogContent className="bg-[#0b0f1a]/95 backdrop-blur-lg border border-white/10 text-white">
              <DialogHeader>
                <DialogTitle>Bắt đầu Live Stream</DialogTitle>
                <DialogDescription>
                  Nhập thông tin cho buổi phát trực tiếp
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm mb-2">Tiêu đề</label>
                  <Input
                    value={streamForm.title}
                    onChange={(e) =>
                      setStreamForm({ ...streamForm, title: e.target.value })
                    }
                    placeholder="Nhập tiêu đề cho Live Stream"
                    className="bg-black/40 border-white/10 text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm mb-2">Mô tả (tùy chọn)</label>
                  <Textarea
                    value={streamForm.description}
                    onChange={(e) =>
                      setStreamForm({
                        ...streamForm,
                        description: e.target.value,
                      })
                    }
                    placeholder="Mô tả về buổi phát..."
                    className="bg-black/40 border-white/10 text-white min-h-[100px]"
                  />
                </div>
              </div>

              <DialogFooter className="mt-4 flex justify-end gap-2">
                <DialogClose asChild>
                  <Button variant="secondary">Hủy</Button>
                </DialogClose>
                <Button
                  onClick={handleStartStream}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  Bắt đầu
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Nút khởi tạo kết nối */}
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary/90 hover:bg-primary text-white">
                Tạo kết nối
              </Button>
            </DialogTrigger>

            <DialogContent className="bg-[#0b0f1a]/95 backdrop-blur-lg border border-white/10 text-white">
              <DialogHeader>
                <DialogTitle>Tạo kết nối</DialogTitle>
                <DialogDescription>
                  Chọn loại kết nối để tạo ingress mới.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm mb-2">Type</label>
                  <Select value={ingressType} onValueChange={setIngressType}>
                    <SelectTrigger className="w-full bg-black/40 border border-white/10 text-slate-200">
                      <SelectValue placeholder="Chọn loại ingress" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#0b0f1a]/95 border-white/10 text-slate-200">
                      <SelectItem value="RTMP_INPUT">RTMP</SelectItem>
                      <SelectItem value="WHIP_INPUT">WHIP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Alert
                  variant="default"
                  className="bg-red-500/10 border-red-400/30 text-white"
                >
                  <AlertTitle>⚠️ Cảnh báo</AlertTitle>
                  <AlertDescription>
                    Thao tác này sẽ đặt lại tất cả các luồng đang hoạt động.
                  </AlertDescription>
                </Alert>
              </div>

              <DialogFooter className="mt-4 flex justify-end gap-2">
                <DialogClose asChild>
                  <Button variant="secondary">Hủy</Button>
                </DialogClose>
                <Button
                  onClick={handleGenerate}
                  disabled={isPending}
                  className="bg-purple-600 hover:bg-purple-500 text-white"
                >
                  {isPending ? "Đang tạo..." : "Tạo"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Server URL */}
      <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-4">
        <label className="block text-sm mb-2">Server URL</label>
        <div className="flex items-center gap-2">
          <input
            className="w-full rounded-xl bg-black/40 border border-white/10 px-3 py-2 text-sm"
            value={serverUrl}
            readOnly
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => copy(serverUrl)}
            className="bg-white/10 hover:bg-white/20 border border-white/10"
          >
            <Copy className="size-4" />
          </Button>
        </div>
      </div>

      {/* Khóa Stream */}
      <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-4">
        <label className="block text-sm mb-2">Stream Key</label>
        <div className="flex items-center gap-2">
          <input
            type={showKey ? "text" : "password"}
            className="w-full rounded-xl bg-black/40 border border-white/10 px-3 py-2 text-sm tracking-widest"
            value={streamKey}
            readOnly
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => copy(streamKey)}
            className="bg-white/10 hover:bg-white/20 border border-white/10"
          >
            <Copy className="size-4" />
          </Button>
        </div>

        <button
          className="mt-2 text-sm text-white/70 hover:text-white inline-flex items-center gap-1"
          onClick={() => setShowKey((v) => !v)}
        >
          {showKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}{" "}
          {showKey ? "Hide" : "Show"}
        </button>
      </div>

      {/* Hướng dẫn tạo kết nối live stream */}
      <Alert className="bg-blue-500/10 border-blue-400/30 text-white">
        <AlertTitle>Hướng dẫn sử dụng</AlertTitle>
        <AlertDescription className="space-y-2 mt-2">
          <p>
            1. Nhấn <strong>"Generate Connection"</strong> để tạo Server URL và
            Stream Key
          </p>
          <p>2. Cấu hình OBS/Streamlabs với thông tin trên</p>
          <p>
            3. Nhấn <strong>"Start Stream"</strong> để tạo phòng live
          </p>
          <p>4. Bắt đầu phát từ OBS - viewer có thể xem ngay!</p>
        </AlertDescription>
      </Alert>
    </div>
  );
}