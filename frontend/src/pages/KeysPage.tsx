// src/pages/KeysPage.tsx
import { useState, useTransition } from "react";
import { Copy, Eye, EyeOff } from "lucide-react";
import { api } from "@/lib/axios";
import { useAuthStore } from "@/stores/useAuthStore";
import { toast } from "sonner";
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

export default function KeysPage() {
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [serverUrl, setServerUrl] = useState("");
  const [streamKey, setStreamKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [ingressType, setIngressType] = useState("RTMP_INPUT");

  // Gọi API backend để tạo ingress (tạo thông tin kết nối: server URL + stream key)
  const handleGenerate = async () => {
    const { user } = useAuthStore.getState();
    console.log("🔍 user hiện tại:", user);

    // Nếu chưa đăng nhập thì không cho tạo ingress
    if (!user) {
      toast.error("Bạn cần đăng nhập trước!");
      return;
    }

    // Dùng transition để tránh UI bị giật/đơ khi đang gọi API
    startTransition(async () => {
      try {
        // Log payload gửi lên backend (phục vụ debug)
        console.log("🛰 Payload gửi đi:", {
          userId: user._id,
          displayName: user.displayName,
          type: ingressType,
        });

        // Gọi API tạo ingress theo loại (RTMP/WHIP)
        const res = await api.post("/livekit/ingress", {
          userId: user._id,
          displayName: user.displayName,
          type: ingressType,
        });

        // Log xác nhận request đã được gửi
        console.log("✅ Sent to backend:", {
          userId: user._id,
          type: ingressType,
        });

        // Nếu backend trả về thành công: lấy server URL + stream key và hiển thị
        if (res.data.success) {
          const { streamUrl, streamKey } = res.data.ingress;
          setServerUrl(streamUrl);
          setStreamKey(streamKey);
          toast.success("Tạo ingress thành công!");
          setOpen(false);
        } else {
          // Backend trả về không thành công (có message)
          toast.error(res.data.message || "Không thể tạo ingress");
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (err: any) {
        // Xử lý lỗi khi gọi API thất bại (network/server)
        console.error("Lỗi:", err);
        toast.error(err.response?.data?.message || "Lỗi server!");
      }
    });
  };

  // Sao chép nội dung (serverUrl/streamKey) vào clipboard
  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied to clipboard!");
    } catch {
      toast.error("Copy failed");
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Phần tiêu đề trang + nút mở hộp thoại tạo kết nối */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Keys & URLs</h1>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button
              className="bg-primary/90 hover:bg-primary text-white"
              onClick={() => setOpen(true)}
            >
              Generate Connection
            </Button>
          </DialogTrigger>

          <DialogContent className="bg-[#0b0f1a]/95 backdrop-blur-lg border border-white/10 text-white">
            <DialogHeader>
              <DialogTitle>Generate Connection</DialogTitle>
              <DialogDescription>
                Select type connection to generate new ingress.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Chọn loại ingress (RTMP hoặc WHIP) */}
              <div>
                <label className="block text-sm mb-2">Type</label>

                <Select value={ingressType} onValueChange={setIngressType}>
                  <SelectTrigger className="w-full bg-black/40 border border-white/10 text-slate-200 focus:ring-2 focus:ring-purple-500">
                    <SelectValue placeholder="Chọn loại ingress" />
                  </SelectTrigger>

                  <SelectContent className="bg-[#0b0f1a]/95 border-white/10 text-slate-200">
                    <SelectItem
                      value="RTMP_INPUT"
                      className="transition-colors data-highlighted:bg-purple-600 data-highlighted:text-white"
                    >
                      RTMP
                    </SelectItem>

                    <SelectItem
                      value="WHIP_INPUT"
                      className="transition-colors data-highlighted:bg-purple-600 data-highlighted:text-white"
                    >
                      WHIP
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Cảnh báo: tạo ingress mới có thể reset các stream đang hoạt động */}
              <Alert
                variant="default"
                className="bg-red-500/10 border-red-400/30 text-white"
              >
                <AlertTitle>⚠ Warning</AlertTitle>
                <AlertDescription>
                  This will reset all active streams.
                </AlertDescription>
              </Alert>
            </div>

            <DialogFooter className="mt-4 flex justify-end gap-2">
              {/* Đóng hộp thoại */}
              <DialogClose asChild>
                <Button variant="secondary">Cancel</Button>
              </DialogClose>

              {/* Gọi tạo ingress */}
              <Button
                onClick={handleGenerate}
                disabled={isPending}
                className="bg-purple-600 hover:bg-purple-500 text-white"
              >
                {isPending ? "Generating..." : "Generate"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Hiển thị Server URL (có nút copy) */}
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

      {/* Hiển thị Stream Key (ẩn/hiện + copy) */}
      <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-4">
        <label className="block text-sm mb-2">Stream Key</label>

        <div className="flex items-center gap-2">
          <input
            // Cho phép ẩn/hiện stream key để tránh lộ thông tin
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

        {/* Nút ẩn/hiện stream key */}
        <button
          className="mt-2 text-sm text-white/70 hover:text-white inline-flex items-center gap-1"
          onClick={() => setShowKey((v) => !v)}
        >
          {showKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}{" "}
          {showKey ? "Hide" : "Show"}
        </button>
      </div>
    </div>
  );
}