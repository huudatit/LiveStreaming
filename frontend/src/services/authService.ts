import { api } from "@/lib/axios";

export const authService = {
  signUp: async (
    username: string,
    password: string,
    email: string,
    displayName: string,
  ) => {
    const res = await api.post(
      "/auth/signup",
      { username, password, email, displayName},
      { withCredentials: true }
    );

    return res.data;
  },

  signIn: async (username: string, password: string) => {
    const res = await api.post(
      "/auth/signin",
      { username, password },
      { withCredentials: true }
    );
    return res.data; // access token
  },

  signOut: async () => {
    return api.post("/auth/signout", { withCredentials: true });
  },

  fetchMe: async () => {
    const res = await api.get("/auth/me", { withCredentials: true });
    return res.data.user;
  },

  refresh: async () => {
    const res = await api.post("/auth/refresh", { withCredentials: true });
    return res.data.accessToken;
  },
};
