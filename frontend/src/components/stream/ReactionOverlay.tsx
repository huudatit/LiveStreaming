import { useEffect, useState } from "react";

interface Reaction {
  id: string;
  emoji: string;
  x: number;
  delay: number;
}

interface ReactionOverlayProps {
  reactions: Reaction[];
}

function ReactionBubble({ emoji, x, delay }: Omit<Reaction, "id">) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Delay xuất hiện
    const showTimer = setTimeout(() => setVisible(true), delay);

    // Tự động ẩn sau 1.5s
    const hideTimer = setTimeout(() => setVisible(false), delay + 1500);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, [delay]);

  return (
    <div
      className={`absolute bottom-0 text-4xl pointer-events-none transition-all duration-1500 ease-out ${
        visible ? "opacity-100 translate-y-[-300px]" : "opacity-0 translate-y-0"
      }`}
      style={{
        left: `${x}%`,
        animation: visible ? "float 1.5s ease-out" : "none",
      }}
    >
      {emoji}
      <style>{`
        @keyframes float {
          0% {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
          50% {
            transform: translateY(-150px) scale(1.2);
            opacity: 1;
          }
          100% {
            transform: translateY(-300px) scale(0.8);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}

export default function ReactionOverlay({ reactions }: ReactionOverlayProps) {
  console.log("🎨 ReactionOverlay rendering with reactions:", reactions.length);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-50">
      {reactions.length > 0 && (
        <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
          {reactions.length} reactions
        </div>
      )}
      {reactions.map((reaction) => (
        <ReactionBubble
          key={reaction.id}
          emoji={reaction.emoji}
          x={reaction.x}
          delay={reaction.delay}
        />
      ))}
    </div>
  );
}
