import React, { useState } from "react";
import LivePlayer from "./LivePlayer";
import ChatBox from "./ChatBox";

const StreamerDashboard: React.FC = () => {
  const [isStreaming, setIsStreaming] = useState(false);
  const streamKey = "stream";
  const streamUrl = `http://localhost:8080/live/${streamKey}.m3u8`;

  const handleStartStreaming = () => {
    setIsStreaming(true);
    alert(`
🔧 Hướng dẫn OBS:
1️⃣ Mở OBS
2️⃣ Chọn Settings > Stream
3️⃣ Server: rtmp://localhost/live
4️⃣ Stream Key: ${streamKey}
5️⃣ Bấm Start Streaming
`);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center p-8 text-white">
      <h1 className="text-3xl font-bold mb-6">🎬 Streamer Dashboard</h1>

      <div className="flex flex-col md:flex-row gap-6 w-full max-w-6xl">
        {/* Left: Stream info + Player */}
        <div className="flex-1 bg-slate-800 p-6 rounded-xl shadow-lg text-center">
          <p className="mb-3 text-slate-300">Your Stream Key:</p>
          <div className="bg-slate-700 px-4 py-2 rounded-md text-lg font-mono select-all mb-4">
            {streamKey}
          </div>
          <button
            onClick={handleStartStreaming}
            className="px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg font-semibold transition-all mb-6"
          >
            🚀 Start Streaming
          </button>

          {isStreaming && (
            <div>
              <h2 className="text-xl font-semibold mb-3 text-slate-300">
                Live Preview:
              </h2>
              <LivePlayer streamUrl={streamUrl} />
            </div>
          )}
        </div>

        {/* Right: Chat */}
        <div className="w-full md:w-[400px]">
          <ChatBox />
        </div>
      </div>
    </div>
  );
};

export default StreamerDashboard;
