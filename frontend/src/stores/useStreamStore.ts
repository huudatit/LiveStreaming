import { useEffect, useState, useRef } from "react";
import { socket } from "@/services/socket";

export function useStreamStore(
  roomName: string,
  displayName: string,
  userId?: string
) {
  const [viewerCount, setViewerCount] = useState(0);
  const [messages, setMessages] = useState<
    {
      displayName: string; message: string; timestamp?: string 
}[]
  >([]);
  const [reactions, setReactions] = useState<
    { id: string; emoji: string; x: number; delay: number }[]
  >([]);

  // Track if we've already joined to prevent duplicates
  const hasJoinedRef = useRef(false);
  const currentRoomRef = useRef<string | null>(null);

  useEffect(() => {
    if (!roomName || !displayName) {
      console.warn("⚠️ Missing roomName or displayName");
      return;
    }

    console.log("🎯 Setting up useStreamStore for:", {
      roomName,
      displayName,
      userId,
    });

    // Prevent duplicate joins
    if (hasJoinedRef.current && currentRoomRef.current === roomName) {
      console.log("⏭️ Already joined this room, skipping");
      return;
    }

    // Leave previous room if switching rooms
    if (currentRoomRef.current && currentRoomRef.current !== roomName) {
      console.log("🚪 Leaving previous room:", currentRoomRef.current);
      socket.emit("leave-stream", { roomName: currentRoomRef.current });
    }

    // Join new room
    console.log("🚪 Joining room:", roomName);
    socket.emit("join-stream", { roomName, displayName, userId });
    hasJoinedRef.current = true;
    currentRoomRef.current = roomName;

    // Set up listeners
    const handleViewerCount = ({ count }: { count: number }) => {
      console.log("👥 Viewer count updated:", count);
      setViewerCount(count);
    };

    const handleSystemMessage = (m: { message: string }) => {
      console.log("📢 System message:", m.message);
      setMessages((prev) => [
        ...prev,
        { displayName: "System", message: m.message },
      ]);
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleChatMessage = (m: any) => {
      console.log("💬 Chat message:", m);
      setMessages((prev) => [...prev, m]);
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleNewReaction = (data: any) => {
      console.log("🎉 New reaction received:", data);

      // ✅ Đảm bảo reaction có đủ thông tin
      const reaction = {
        id: data.id,
        emoji: data.emoji,
        x: data.x,
        delay: data.delay || 0,
      };

      setReactions((prev) => {
        console.log("Current reactions:", prev.length, "Adding:", reaction);
        return [...prev, reaction];
      });

      // Tự động xóa sau 1.5s
      setTimeout(() => {
        setReactions((prev) => {
          const filtered = prev.filter((r) => r.id !== data.id);
          console.log(
            "Removed reaction:",
            data.id,
            "Remaining:",
            filtered.length
          );
          return filtered;
        });
      }, 1500);
    };

    // Register event listeners
    socket.on("viewer-count", handleViewerCount);
    socket.on("system-message", handleSystemMessage);
    socket.on("chat-message", handleChatMessage);
    socket.on("new-reaction", handleNewReaction);

    console.log("✅ Event listeners registered");

    // Cleanup function
    return () => {
      console.log("🧹 Cleaning up useStreamStore");
      if (currentRoomRef.current) {
        socket.emit("leave-stream", { roomName: currentRoomRef.current });
        hasJoinedRef.current = false;
        currentRoomRef.current = null;
      }
      socket.off("viewer-count", handleViewerCount);
      socket.off("system-message", handleSystemMessage);
      socket.off("chat-message", handleChatMessage);
      socket.off("new-reaction", handleNewReaction);
    };
  }, [roomName, displayName, userId]);

  const sendChat = (message: string, streamId?: string) => {
    if (message.trim()) {
      console.log("📤 Sending chat:", { roomName, displayName, userId, streamId });
      socket.emit("chat-message", {
        roomName,
        message,
        displayName,
        userId,
        streamId,
      });
    }
  };

  const sendReaction = (emoji: string) => {
    console.log("📤 Sending reaction:", { roomName, emoji, displayName });
    socket.emit("send-reaction", { roomName, emoji, displayName });
  };

  return { viewerCount, messages, sendChat, sendReaction, reactions };
}
