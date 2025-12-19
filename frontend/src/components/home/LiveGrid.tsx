import type { Stream } from "@/types/stream";
import LiveCard from "./LiveCard";

export default function LiveGrid({ items }: { items: Stream[] }) {
  if (!items?.length) {
    return <div className="text-slate-400">Chưa có kênh nào đang live</div>;
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map((s) => (
        <LiveCard key={s._id || s.room} s={s} />
      ))}
    </div>
  );
}
