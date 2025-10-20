import React, { useEffect, useState } from "react";
import { socket } from "../services/socket";

interface Message {
  id: string;
  user: string;
  text: string;
}

const ChatBox: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");

  useEffect(() => {
    socket.on("chatMessage", (msg: Message) => {
      setMessages((prev) => [...prev, msg]);
    });

    return () => {
      socket.off("chatMessage");
    };
  }, []);

  const handleSend = () => {
    if (!input.trim()) return;
    const newMsg = { id: Date.now().toString(), user: "Streamer", text: input };
    socket.emit("chatMessage", newMsg);
    setInput("");
  };

  return (
    <div className="flex flex-col bg-slate-800 border border-slate-700 rounded-xl p-4 h-[500px] w-full max-w-md">
      <h2 className="text-white font-semibold mb-2">💬 Live Chat</h2>
      <div className="flex-1 overflow-y-auto space-y-2 mb-4 bg-slate-900 p-2 rounded-md">
        {messages.map((msg) => (
          <div key={msg.id} className="text-slate-200">
            <span className="font-bold text-green-400">{msg.user}:</span>{" "}
            {msg.text}
          </div>
        ))}
      </div>
      <div className="flex">
        <input
          className="flex-1 px-3 py-2 bg-slate-700 text-white rounded-l-md outline-none"
          placeholder="Nhập tin nhắn..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
        />
        <button
          onClick={handleSend}
          className="px-4 bg-green-600 hover:bg-green-700 rounded-r-md"
        >
          Gửi
        </button>
      </div>
    </div>
  );
};

export default ChatBox;
