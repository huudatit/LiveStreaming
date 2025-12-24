import { useState } from "react";
import { useAuthStore } from "@/stores/useAuthStore";
import { useStreamStore } from "@/stores/useStreamStore";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
} from "@/components/ui/card";

export default function ChatBox({
  streamId,
  roomName,
}: {
  streamId: string;
  roomName?: string;
}) {
  const { user } = useAuthStore();
  const displayName =
    user?.displayName || `viewer_${Math.floor(Math.random() * 1000)}`;

  const actualRoomName = roomName || streamId;
  const { messages, sendChat } = useStreamStore(
    actualRoomName,
    displayName,
    user?._id
  );

  const [input, setInput] = useState("");

  const handleSend = () => {
    if (input.trim()) {
      sendChat(input, streamId);
      setInput("");
    }
  };

  return (
    <Card className="flex flex-col h-[625px] bg-[#0b0f1a]/80 border-white/10 text-slate-200 backdrop-blur-md">
      <CardHeader className="pb-2">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          💬 Chat
        </h2>
      </CardHeader>

      {/* Messages list */}
      <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea className="h-full px-4 py-2 space-y-2">
          {messages.length === 0 ? (
            <p className="text-center text-slate-500 text-sm">
              Chưa có tin nhắn nào
            </p>
          ) : (
            messages.map((m, i) => (
              <div key={i} className="text-sm leading-snug">
                <span className="font-semibold text-purple-400">
                  {m.displayName}
                </span>
                <span className="text-slate-300">: {m.message}</span>
              </div>
            ))
          )}
        </ScrollArea>
      </CardContent>

      {/* Input */}
      <CardFooter className="flex flex-col gap-2 border-t border-white/10 p-3 ml-1">
        {/* Ô nhập và nút gửi */}
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Nhập tin nhắn..."
            className="bg-black/40 border-white/10 text-white placeholder:text-slate-500 w-75"
          />
          <Button
            onClick={handleSend}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            Gửi
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
