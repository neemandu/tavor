"use client";

import { Globe } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export interface EnrichmentItem {
  id: string;
  title: string;
  description: string | null;
  url: string;
  thumbnail_url: string | null;
  category: string | null;
}

const CATEGORY_LABELS: Record<string, string> = {
  culture: "תרבות",
  geography: "גיאוגרפיה",
  religion: "דת",
  levantine: "לבנטי",
  other: "אחר",
};

export function EnrichmentCard({ item }: { item: EnrichmentItem }) {
  function handleClick() {
    // Fire-and-forget — do not block opening the link
    fetch("/api/enrichment/view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enrichmentId: item.id }),
    }).catch(() => {
      // Swallow errors — never block the user
    });

    window.open(item.url, "_blank", "noopener,noreferrer");
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") handleClick();
      }}
      className="rounded-lg border bg-card text-card-foreground cursor-pointer hover:shadow-md transition-shadow overflow-hidden flex flex-col"
    >
      {item.thumbnail_url ? (
        <img
          src={item.thumbnail_url}
          alt={item.title}
          className="w-full h-40 object-cover"
        />
      ) : (
        <div className="w-full h-40 bg-muted flex items-center justify-center">
          <Globe className="size-10 text-muted-foreground" />
        </div>
      )}

      <div className="p-3 flex flex-col gap-1.5 flex-1">
        <p className="font-semibold text-sm leading-tight line-clamp-2">{item.title}</p>
        {item.category && (
          <Badge variant="outline" className="w-fit text-xs">
            {CATEGORY_LABELS[item.category] ?? item.category}
          </Badge>
        )}
        {item.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
            {item.description}
          </p>
        )}
      </div>
    </div>
  );
}
