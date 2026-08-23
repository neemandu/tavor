"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

export function FeedbackCell({ feedbackText }: { feedbackText: string | null }) {
  const [open, setOpen] = useState(false);

  if (!feedbackText) {
    return <span className="text-muted-foreground">✗</span>;
  }

  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
      >
        {open ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
        {open ? "הסתר" : "הצג"}
      </button>
      {open && (
        <p className="mt-2 text-sm leading-relaxed whitespace-pre-wrap max-w-md">{feedbackText}</p>
      )}
    </div>
  );
}
