import { Sparkles } from "lucide-react";
import type { MemoryCard } from "@fanpass/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface MemoryCardTileProps {
  card: MemoryCard;
}

/** Populated by the post-match AI summary flow (Phase 4/6) — the shape is real, just not yet triggered. */
export function MemoryCardTile({ card }: MemoryCardTileProps) {
  return (
    <Card className="overflow-hidden">
      {card.shareImageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={card.shareImageUrl} alt="" className="h-32 w-full object-cover" />
      )}
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Sparkles className="size-4 text-primary" />
          Match Memory
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 text-sm text-muted-foreground">
        <p>{card.aiSummary}</p>
        {card.highlights.length > 0 && (
          <ul className="list-disc pl-5">
            {card.highlights.map((highlight, i) => (
              <li key={i}>{highlight}</li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
