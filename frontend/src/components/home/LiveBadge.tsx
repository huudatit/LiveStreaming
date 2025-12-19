// src/components/stream/LiveBadge.tsx
import { Badge } from "@/components/ui/badge";

export default function LiveBadge({ live = false }: { live?: boolean }) {
  if (!live) return null;
  return (
    <Badge className="bg-red-600 hover:bg-red-600">
      <span className="mr-1 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
      LIVE
    </Badge>
  );
}
