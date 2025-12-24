import { api } from "@/lib/axios";
import type { User } from "@/types/user";

export const userService = {
  // Lấy thông tin user theo username
  getUserProfile: async (username: string) => {
    const res = await api.get(`/users/${username}`);
    return res.data.user as User;
  },

  // Follow/Unfollow user
  followUser: async (userId: string) => {
    const res = await api.post(
      `/users/${userId}/follow`,
      {},
      { withCredentials: true }
    );
    return res.data;
  },

  // Kiểm tra xem đang follow user này không
  checkIsFollowing: async (userId: string) => {
    const res = await api.get(`/users/${userId}/is-following`, {
      withCredentials: true,
    });
    return res.data.isFollowing;
  },

  // Cập nhật profile của user hiện tại
  updateProfile: async (data: {
    displayName?: string;
    bio?: string;
    avatar?: string;
  }) => {
    const res = await api.patch("/users/profile", data, {
      withCredentials: true,
    });
    return res.data.user as User;
  },

  // Lấy danh sách kênh đang follow
  getFollowingChannels: async () => {
    const res = await api.get("/users/following/channels", {
      withCredentials: true,
    });
    return res.data.channels as Array<{
      _id: string;
      username: string;
      displayName: string;
      avatar?: string;
      isLive: boolean;
    }>;
  },
};
