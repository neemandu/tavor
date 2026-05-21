"use client";

import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ArabicLetter } from "@/lib/arabic-letters";

interface LettersGridProps {
  letters: ArabicLetter[];
  mastered: string[];
}

export function LettersGrid({ letters, mastered }: LettersGridProps) {
  const masteredSet = new Set(mastered);

  return (
    <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-7 gap-2">
      {letters.map((letter) => {
        const isMastered = masteredSet.has(letter.id);
        return (
          <Link
            key={letter.id}
            href={`/letters/${letter.id}`}
            className={cn(
              "relative flex flex-col items-center justify-center gap-1 rounded-xl border p-3 transition-colors hover:bg-muted/60 active:scale-95",
              isMastered
                ? "border-green-300 bg-green-50 dark:bg-green-950/20 dark:border-green-800"
                : "border-border bg-card"
            )}
          >
            {isMastered && (
              <CheckCircle2 className="absolute top-1 end-1 size-3.5 text-green-500" />
            )}
            <span
              className="text-2xl leading-none"
              dir="rtl"
              lang="ar"
              style={{ fontFamily: "var(--font-noto-arabic)" }}
            >
              {letter.arabic}
            </span>
            <span className="text-[10px] text-muted-foreground text-center leading-tight">
              {letter.nameHe}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
