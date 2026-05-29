"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Volume2 } from "lucide-react";
import { useTTS } from "@/hooks/use-tts";
import type { ArabicLetter } from "@/lib/arabic-letters";

const FORM_LABELS: Record<keyof ArabicLetter["forms"], string> = {
  isolated: "מבודדת",
  initial: "ראשונית",
  medial: "אמצעית",
  final: "סופית",
};

export function MeetLetterCard({
  letter,
  onStart,
}: {
  letter: ArabicLetter;
  onStart: () => void;
}) {
  const { play, unlock } = useTTS();

  return (
    <div className="p-4 max-w-lg mx-auto space-y-4">
      <Card>
        <CardContent className="p-6 space-y-5 text-center">
          <button
            onClick={() => {
              unlock();
              play(letter.name, "ar");
            }}
            className="relative mx-auto block text-7xl leading-none"
            dir="rtl"
            lang="ar"
            style={{ fontFamily: "var(--font-noto-arabic)" }}
            title="לחץ לשמוע את האות"
          >
            {letter.arabic}
            <Volume2 className="absolute -bottom-1 -start-2 size-4 text-muted-foreground" />
          </button>

          <div>
            <p className="text-lg font-bold">{letter.nameHe}</p>
            <p className="text-sm text-muted-foreground">{letter.pronunciation}</p>
          </div>

          {/* The 4 forms */}
          <div className="grid grid-cols-4 gap-2 pt-2">
            {(Object.keys(FORM_LABELS) as Array<keyof ArabicLetter["forms"]>).map((k) => (
              <div key={k} className="rounded-lg border p-2">
                <span
                  className="block text-2xl leading-none"
                  dir="rtl"
                  lang="ar"
                  style={{ fontFamily: "var(--font-noto-arabic)" }}
                >
                  {letter.forms[k]}
                </span>
                <span className="block text-[10px] text-muted-foreground mt-1">
                  {FORM_LABELS[k]}
                </span>
              </div>
            ))}
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed">{letter.strokeHint}</p>
        </CardContent>
      </Card>

      <Button className="w-full" size="lg" onClick={onStart}>
        התחל תרגול
      </Button>
    </div>
  );
}
