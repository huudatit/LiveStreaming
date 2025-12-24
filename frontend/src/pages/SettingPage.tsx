import { useState, useEffect } from "react";
import { useAuthStore } from "@/stores/useAuthStore";
import { api } from "@/lib/axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

export default function SettingsPage() {
  const { user, fetchMe } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    displayName: "",
    bio: "",
    avatar: "",
  });

  useEffect(() => {
    if (user) {
      setForm({
        displayName: user.displayName || "",
        bio: user.bio || "",
        avatar: user.avatarUrl || "",
      });
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.displayName.trim()) {
      toast.error("Tên hiển thị không được để trống");
      return;
    }

    try {
      setLoading(true);
      const { data } = await api.patch("/users/profile", form);

      if (data.success) {
        toast.success("Cập nhật thông tin thành công!");
        await fetchMe(); // Refresh user data
      }
    } catch (error) {
      console.error("Update profile error:", error);
      toast.error("Không thể cập nhật thông tin");
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0b0f1a] text-white">
        Vui lòng đăng nhập để truy cập trang này
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0f1a] text-white p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Cài đặt tài khoản</h1>
          <p className="text-slate-400 mt-2">
            Quản lý thông tin cá nhân và tùy chỉnh hồ sơ của bạn
          </p>
        </div>

        <Separator className="bg-white/10" />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sidebar với avatar preview */}
          <Card className="bg-white/5 border-white/10 lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-white text-center">
                Ảnh đại diện
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4">
              <div className="w-32 h-32 rounded-full bg-white/10 overflow-hidden">
                {form.avatar ? (
                  <img
                    src={form.avatar}
                    alt={form.displayName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full grid place-items-center text-3xl font-semibold text-slate-300">
                    {form.displayName.slice(0, 2).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="text-center">
                <p className="font-semibold">{form.displayName}</p>
                <p className="text-sm text-slate-400">@{user.username}</p>
              </div>
            </CardContent>
          </Card>

          {/* Form chỉnh sửa */}
          <Card className="bg-white/5 border-white/10 lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-white">Thông tin cá nhân</CardTitle>
              <CardDescription>
                Cập nhật thông tin hiển thị công khai của bạn
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Username (read-only) */}
                <div className="space-y-2 text-white">
                  <Label htmlFor="username">Tên đăng nhập</Label>
                  <Input
                    id="username"
                    value={user.username}
                    disabled
                    className="bg-white/5 border-white/10 text-slate-400"
                  />
                  <p className="text-xs text-red-500">
                    *Tên đăng nhập không thể thay đổi
                  </p>
                </div>

                {/* Email (read-only) */}
                <div className="space-y-2 text-white">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    value={user.email}
                    disabled
                    className="bg-white/5 border-white/10 text-slate-400"
                  />
                  <p className="text-xs text-red-500">
                    *Email không thể thay đổi
                  </p>
                </div>

                {/* Display Name */}
                <div className="space-y-2 text-white">
                  <Label htmlFor="displayName">Tên hiển thị *</Label>
                  <Input
                    id="displayName"
                    value={form.displayName}
                    onChange={(e) =>
                      setForm({ ...form, displayName: e.target.value })
                    }
                    placeholder={user.displayName}
                    className="bg-white/5 border-white/10 text-white"
                  />
                </div>

                {/* Bio */}
                <div className="space-y-2 text-white">
                  <Label htmlFor="bio">Giới thiệu</Label>
                  <Textarea
                    id="bio"
                    value={form.bio}
                    onChange={(e) => setForm({ ...form, bio: e.target.value })}
                    placeholder="Viết vài dòng về bản thân..."
                    className="bg-white/5 border-white/10 text-white min-h-[120px]"
                    maxLength={500}
                  />
                  <p className="text-xs text-slate-500">
                    {form.bio.length}/500 ký tự
                  </p>
                </div>

                {/* Avatar URL */}
                <div className="space-y-2 text-white">
                  <Label htmlFor="avatar">URL ảnh đại diện</Label>
                  <Input
                    id="avatar"
                    value={form.avatar}
                    onChange={(e) =>
                      setForm({ ...form, avatar: e.target.value })
                    }
                    placeholder="https://example.com/avatar.jpg"
                    className="bg-white/5 border-white/10 text-white"
                  />
                  <p className="text-xs text-slate-500">
                    Nhập URL hình ảnh từ internet
                  </p>
                </div>

                <Separator className="bg-white/10" />

                {/* Action Buttons */}
                <div className="flex items-center gap-3">
                  <Button
                    type="submit"
                    disabled={loading}
                    className="bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    {loading ? "Đang lưu..." : "Lưu thay đổi"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setForm({
                        displayName: user.displayName || "",
                        bio: user.bio || "",
                        avatar: user.avatarUrl || "",
                      });
                      toast.info("Đã hủy thay đổi");
                    }}
                    className="bg-white hover:bg-white/10 border-white/10"
                  >
                    Hủy
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Thống kê */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Thống kê kênh</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                <p className="text-sm text-slate-400">Người theo dõi</p>
                <p className="text-2xl font-bold text-white mt-1">
                  {user.followers?.length || 0}
                </p>
              </div>
              <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                <p className="text-sm text-slate-400">Đang theo dõi</p>
                <p className="text-2xl font-bold text-white mt-1">
                  {user.following?.length || 0}
                </p>
              </div>
              <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                <p className="text-sm text-slate-400">Tổng lượt xem</p>
                <p className="text-2xl font-bold text-white mt-1">
                  {user.totalViews || 0}
                </p>
              </div>
              <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                <p className="text-sm text-slate-400">Stream Key</p>
                <p className="text-xs text-purple-400 mt-2 truncate">
                  {user.streamKey || "N/A"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}