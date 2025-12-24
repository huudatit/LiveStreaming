import { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/useAuthStore";

export default function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { refresh, fetchMe, accessToken } = useAuthStore();
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
        // Try to refresh token from httpOnly cookie
        if (!accessToken) {
          try {
            await refresh();
          } catch (refreshError) {
            // Refresh failed - user is not logged in or token expired
            // This is normal, just continue as guest
            console.log("No active session found");
          }
        }

        // If we have token but no user, fetch user info
        const currentToken = useAuthStore.getState().accessToken;
        const currentUser = useAuthStore.getState().user;
        
        if (currentToken && !currentUser) {
          try {
            await fetchMe();
          } catch (fetchError) {
            console.error("Failed to fetch user:", fetchError);
            // Clear invalid token
            useAuthStore.getState().clearState();
          }
        }
      } catch (error) {
        console.error("Auth initialization failed:", error);
        // Don't show error toast here, just silently fail
        // User can still use the app as guest
      } finally {
        setInitializing(false);
      }
    };

    initAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Show loading state while initializing
  if (initializing) {
    return (
      <div className="min-h-screen bg-[#0b0f1a] text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Đang khởi động...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
