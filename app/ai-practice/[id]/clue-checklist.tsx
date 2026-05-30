"use client";

import { useState } from "react";
import { Lightbulb, ChevronDown, ChevronUp, Check } from "lucide-react";
import { cn } from "@/lib/utils";

// Collapsible, tap-to-check clue list shown during a voice scenario conversation.
// Session-only: state resets each time the component mounts (per conversation).
export function ClueChecklist({ hints }: { hints: string[] }) {
  const [open, setOpen] = useState(true);
  const [checked, setChecked] = useState<boolean[]>(() => hints.map(() => false));

  if (hints.length === 0) return null;

  const count = checked.filter(Boolean).length;

  return (
    <div className="mx-4 mb-1 rounded-xl border border-white/10 bg-white/5">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white/80"
      >
        <Lightbulb className="size-4 text-amber-300" />
        רמזים — {count}/{hints.length}
        <span className="ms-auto text-white/50">
          {open ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
        </span>
      </button>

      {open && (
        <ul className="max-h-[40vh] overflow-y-auto px-2 pb-2 space-y-1">
          {hints.map((hint, i) => (
            <li key={i}>
              <button
                onClick={() => setChecked((prev) => prev.map((c, idx) => (idx === i ? !c : c)))}
                className={cn(
                  "flex w-full items-start gap-2.5 rounded-lg px-2 py-2 text-start text-sm transition-colors hover:bg-white/5",
                  checked[i] ? "text-white/40" : "text-white/85"
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border",
                    checked[i] ? "border-green-400 bg-green-500/80" : "border-white/30"
                  )}
                >
                  {checked[i] && <Check className="size-3.5 text-white" />}
                </span>
                <span className={cn("leading-snug", checked[i] && "line-through")}>{hint}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
