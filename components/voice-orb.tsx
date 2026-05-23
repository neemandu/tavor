"use client";

import { Mic } from "lucide-react";
import { cn } from "@/lib/utils";

export type OrbState = "idle" | "listening" | "speaking" | "loading";

const ORB_BACKGROUNDS: Record<OrbState, string> = {
  idle: "radial-gradient(circle at center, oklch(22% 0 0), oklch(14% 0 0))",
  listening: "radial-gradient(circle at center, oklch(92% 0 0), oklch(78% 0 0))",
  speaking:
    "radial-gradient(circle at center, oklch(70% 0.22 40 / 0.9), oklch(65% 0.22 40))",
  loading:
    "radial-gradient(circle at center, oklch(65% 0.22 40 / 0.35), oklch(55% 0.22 40 / 0.25))",
};

interface VoiceOrbProps {
  state: OrbState;
  onClick: () => void;
  disabled?: boolean;
}

export function VoiceOrb({ state, onClick, disabled }: VoiceOrbProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label="מיקרופון"
      className={cn(
        "w-48 h-48 rounded-full relative transition-all duration-500 focus:outline-none flex items-center justify-center",
        state === "idle" && "ring-2 ring-white/25",
        state === "listening" &&
          "shadow-[0_0_60px_rgba(255,255,255,0.3)] animate-pulse",
        state === "speaking" &&
          "shadow-[0_0_80px_rgba(255,107,53,0.6)] [animation:breathe_1.5s_ease-in-out_infinite]",
        disabled && "cursor-not-allowed opacity-40"
      )}
      style={{ background: ORB_BACKGROUNDS[state] }}
    >
      {state === "idle" && (
        <Mic className="size-12 text-white/60" strokeWidth={1.5} />
      )}
      {state === "loading" && (
        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary/60 animate-spin" />
      )}
    </button>
  );
}
