import { useStreamStore } from "@/stores/useStreamStore";
import { useAuthStore } from "@/stores/useAuthStore";

interface ReactionButtonsProps {
  roomName: string;
}

const REACTIONS = [
  { emoji: "👍", label: "Like" },
  { emoji: "❤️", label: "Love" },
  { emoji: "😂", label: "Haha" },
  { emoji: "😮", label: "Wow" },
  { emoji: "😢", label: "Sad" },
  { emoji: "🎉", label: "Party" },
];

export default function ReactionButtons({ roomName }: ReactionButtonsProps) {
  const { user } = useAuthStore();
  const username = user?.username || "guest";
  const { sendReaction } = useStreamStore(roomName, username, user?._id);

  const handleReaction = (emoji: string) => {
    sendReaction(emoji);

    // Tạo hiệu ứng visual khi click
    const button = document.activeElement as HTMLButtonElement;
    if (button) {
      button.classList.add("scale-125");
      setTimeout(() => {
        button.classList.remove("scale-125");
      }, 200);
    }
  };

  return (
    <div className="mt-3 p-2 bg-white/5 rounded-xl border border-white/10">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-slate-300">Reactions</span>
        <span className="text-xs text-slate-500">Nhấn để gửi</span>
      </div>
      <div className="grid grid-cols-6 gap-3">
        {REACTIONS.map(({ emoji, label }) => (
          <button
            key={emoji}
            onClick={() => handleReaction(emoji)}
            className="aspect-square flex items-center justify-center text-2xl hover:bg-white/10 rounded-lg transition-all duration-200 hover:scale-110 active:scale-95"
            title={label}
            aria-label={label}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}
