"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, ArrowLeft, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  buildSession,
  makeFormQuestion,
  LETTER_BY_ID,
  type Question,
  type LetterStat,
} from "@/lib/letter-exercises";
import type { ArabicLetter } from "@/lib/arabic-letters";
import { MeetLetterCard } from "./meet-letter-card";
import { invalidateLevelCache } from "@/components/student-shell";
import { useTTS } from "@/hooks/use-tts";

type Delta = { correct: number; attempts: number };
const MAX_RESURFACE = 6;
const arabicStyle = { fontFamily: "var(--font-noto-arabic)" } as const;

function LetterGlyph({ id, className }: { id: string; className?: string }) {
  return (
    <span dir="rtl" lang="ar" className={className} style={arabicStyle}>
      {LETTER_BY_ID[id].arabic}
    </span>
  );
}

// Small speaker button to hear the written Arabic text via TTS.
function SpeakerButton({ text }: { text: string }) {
  const { play, unlock } = useTTS();
  return (
    <button
      type="button"
      onClick={() => {
        unlock();
        play(text, "ar");
      }}
      aria-label="השמע"
      className="inline-flex items-center justify-center size-9 rounded-full border text-muted-foreground hover:text-foreground hover:bg-muted/60 active:scale-95 transition-colors"
    >
      <Volume2 className="size-4" />
    </button>
  );
}

export function LetterPracticeSession({
  mode,
  letterId,
  initialStats,
}: {
  mode: "mixed" | "focused";
  letterId?: string;
  initialStats: Record<string, LetterStat>;
}) {
  const focusLetter: ArabicLetter | undefined = letterId
    ? LETTER_BY_ID[letterId]
    : undefined;

  const [phase, setPhase] = useState<"meet" | "playing" | "done">(
    mode === "focused" ? "meet" : "playing"
  );
  const [queue, setQueue] = useState<Question[]>([]);
  const [idx, setIdx] = useState(0);

  // Per-letter deltas accumulated across the session.
  const deltasRef = useRef<Map<string, Delta>>(new Map());
  const resurfacedRef = useRef(0);

  const [newlyMastered, setNewlyMastered] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const submittedRef = useRef(false);

  // Build the queue on the client only (Math.random → avoid SSR hydration mismatch).
  useEffect(() => {
    setQueue(buildSession(initialStats, { mode, letterId, count: 10 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function credit(letter: string, correct: boolean) {
    const d = deltasRef.current.get(letter) ?? { correct: 0, attempts: 0 };
    d.attempts += 1;
    if (correct) d.correct += 1;
    deltasRef.current.set(letter, d);
  }

  function resurface(letter: string) {
    if (resurfacedRef.current >= MAX_RESURFACE) return;
    resurfacedRef.current += 1;
    setQueue((q) => {
      const next = q.slice();
      const at = Math.min(idx + 2, next.length);
      next.splice(at, 0, makeFormQuestion(letter));
      return next;
    });
  }

  async function finish() {
    setPhase("done");
    if (submittedRef.current) return;
    submittedRef.current = true;
    const results = Array.from(deltasRef.current.entries()).map(([letter, d]) => ({
      letter,
      correct: d.correct,
      attempts: d.attempts,
    }));
    if (results.length === 0) return;
    setSaving(true);
    try {
      const res = await fetch("/api/letters/practice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ results }),
      });
      if (res.ok) {
        const data = await res.json();
        const mastered = (data.newlyMastered as string[]) ?? [];
        setNewlyMastered(mastered);
        // New letters mastered → XP changed, so refresh the header level badge.
        if (mastered.length > 0) invalidateLevelCache();
      } else {
        toast.error("שמירת ההתקדמות נכשלה");
      }
    } catch {
      toast.error("שמירת ההתקדמות נכשלה");
    } finally {
      setSaving(false);
    }
  }

  function advance() {
    if (idx + 1 >= queue.length) finish();
    else setIdx((i) => i + 1);
  }

  if (phase === "meet" && focusLetter) {
    return <MeetLetterCard letter={focusLetter} onStart={() => setPhase("playing")} />;
  }

  if (phase === "done") {
    return <SessionSummary newlyMastered={newlyMastered} saving={saving} />;
  }

  if (queue.length === 0) {
    return <p className="p-8 text-center text-muted-foreground">טוען תרגול…</p>;
  }

  const q = queue[idx];
  const progress = Math.round((idx / queue.length) * 100);

  return (
    <div className="p-4 max-w-lg mx-auto space-y-5">
      {/* progress */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {idx + 1} / {queue.length}
          </span>
          <Link href="/letters" className="hover:text-foreground">
            סיום
          </Link>
        </div>
        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {q.kind === "form" ? (
        <FormCard key={idx} q={q} onCredit={credit} onMiss={resurface} onNext={advance} />
      ) : (
        <ClusterCard key={idx} q={q} onCredit={credit} onMiss={resurface} onNext={advance} />
      )}
    </div>
  );
}

// ---- Form question ----
function FormCard({
  q,
  onCredit,
  onMiss,
  onNext,
}: {
  q: Extract<Question, { kind: "form" }>;
  onCredit: (letter: string, correct: boolean) => void;
  onMiss: (letter: string) => void;
  onNext: () => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const answered = selected !== null;

  function choose(id: string) {
    if (answered) return;
    setSelected(id);
    const correct = id === q.letterId;
    onCredit(q.letterId, correct);
    if (!correct) onMiss(q.letterId);
  }

  return (
    <Card>
      <CardContent className="p-6 space-y-5">
        <p className="text-center text-sm text-muted-foreground">איזו אות זו?</p>
        <div className="text-center text-7xl leading-none" dir="rtl" lang="ar" style={arabicStyle}>
          {q.glyph}
        </div>
        <div className="flex justify-center">
          <SpeakerButton text={q.glyph} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          {q.choices.map((id) => {
            const isCorrect = id === q.letterId;
            const isSelected = id === selected;
            return (
              <button
                key={id}
                onClick={() => choose(id)}
                disabled={answered}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-xl border p-3 transition-colors",
                  !answered && "hover:bg-muted/60 active:scale-95",
                  answered && isCorrect && "border-green-400 bg-green-50 dark:bg-green-950/20",
                  answered && isSelected && !isCorrect && "border-red-400 bg-red-50 dark:bg-red-950/20",
                  answered && !isCorrect && !isSelected && "opacity-50"
                )}
              >
                <LetterGlyph id={id} className="text-3xl leading-none" />
                <span className="text-xs text-muted-foreground">{LETTER_BY_ID[id].nameHe}</span>
                {answered && isCorrect && <CheckCircle2 className="size-4 text-green-500" />}
                {answered && isSelected && !isCorrect && <XCircle className="size-4 text-red-500" />}
              </button>
            );
          })}
        </div>

        {answered && selected === q.letterId && (
          <p className="text-center text-sm font-semibold text-green-600">נכון!</p>
        )}
        {answered && selected !== q.letterId && (
          <p className="text-center text-sm font-semibold text-red-600">
            התשובה הנכונה:{" "}
            <span dir="rtl" lang="ar" style={arabicStyle} className="text-lg align-middle">
              {LETTER_BY_ID[q.letterId].arabic}
            </span>{" "}
            ({LETTER_BY_ID[q.letterId].nameHe})
          </p>
        )}

        {answered && (
          <Button className="w-full" onClick={onNext}>
            המשך
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// ---- Cluster question ----
function ClusterCard({
  q,
  onCredit,
  onMiss,
  onNext,
}: {
  q: Extract<Question, { kind: "cluster" }>;
  onCredit: (letter: string, correct: boolean) => void;
  onMiss: (letter: string) => void;
  onNext: () => void;
}) {
  // progress[i] = "correct" | "wrong" once position i is resolved
  const [progress, setProgress] = useState<("correct" | "wrong")[]>([]);
  const pos = progress.length;
  const done = pos >= q.sequence.length;
  const [flash, setFlash] = useState<string | null>(null);
  const [flashCorrect, setFlashCorrect] = useState<string | null>(null);

  function tap(id: string) {
    if (done) return;
    const expected = q.sequence[pos];
    const correct = id === expected;
    onCredit(expected, correct);
    if (correct) {
      setProgress((p) => [...p, "correct"]);
    } else {
      onMiss(expected);
      // flash the wrong tap red and the correct letter green, then advance
      setFlash(id);
      setFlashCorrect(expected);
      setTimeout(() => {
        setFlash(null);
        setFlashCorrect(null);
      }, 700);
      setProgress((p) => [...p, "wrong"]);
    }
  }

  return (
    <Card>
      <CardContent className="p-6 space-y-5">
        <p className="text-center text-sm text-muted-foreground">
          קרא את הצירוף — לחץ על האותיות לפי הסדר (מימין לשמאל)
        </p>
        <div className="text-center text-6xl leading-none" dir="rtl" lang="ar" style={arabicStyle}>
          {q.cluster}
        </div>
        <div className="flex justify-center">
          <SpeakerButton text={q.cluster} />
        </div>

        {/* revealed sequence so far */}
        <div className="flex items-center justify-center gap-2" dir="rtl">
          {q.sequence.map((id, i) => (
            <div
              key={i}
              className={cn(
                "w-10 h-10 rounded-lg border flex items-center justify-center",
                i < pos
                  ? progress[i] === "correct"
                    ? "border-green-400 bg-green-50 dark:bg-green-950/20"
                    : "border-red-400 bg-red-50 dark:bg-red-950/20"
                  : i === pos
                  ? "border-primary"
                  : "border-dashed border-border"
              )}
            >
              {i < pos && <LetterGlyph id={id} className="text-2xl leading-none" />}
            </div>
          ))}
        </div>

        {/* palette */}
        <div className="grid grid-cols-3 gap-2">
          {q.palette.map((id) => (
            <button
              key={id}
              onClick={() => tap(id)}
              disabled={done}
              className={cn(
                "flex flex-col items-center gap-1 rounded-xl border p-3 transition-colors",
                !done && "hover:bg-muted/60 active:scale-95",
                flash === id && "border-red-400 bg-red-50 dark:bg-red-950/20",
                flashCorrect === id && "border-green-400 bg-green-50 dark:bg-green-950/20",
                done && "opacity-50"
              )}
            >
              <LetterGlyph id={id} className="text-2xl leading-none" />
              <span className="text-[10px] text-muted-foreground">{LETTER_BY_ID[id].nameHe}</span>
            </button>
          ))}
        </div>

        {done && (
          <Button className="w-full" onClick={onNext}>
            המשך
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// ---- Summary ----
function SessionSummary({
  newlyMastered,
  saving,
}: {
  newlyMastered: string[];
  saving: boolean;
}) {
  return (
    <div className="p-4 max-w-lg mx-auto space-y-5 pt-10 text-center">
      <div className="text-5xl">🎉</div>
      <h1 className="text-2xl font-black">כל הכבוד!</h1>

      {saving ? (
        <p className="text-sm text-muted-foreground">שומר התקדמות…</p>
      ) : newlyMastered.length > 0 ? (
        <Card>
          <CardContent className="p-5 space-y-3">
            <p className="text-sm text-muted-foreground">אותיות חדשות ששלטת בהן</p>
            <div className="flex flex-wrap justify-center gap-2" dir="rtl">
              {newlyMastered.map((id) => (
                <LetterGlyph key={id} id={id} className="text-3xl leading-none" />
              ))}
            </div>
            <Badge className="text-xs">+{newlyMastered.length * 2} נקודות</Badge>
          </CardContent>
        </Card>
      ) : (
        <p className="text-sm text-muted-foreground">המשך להתאמן כדי לשלוט באותיות נוספות</p>
      )}

      <div className="flex flex-col gap-2">
        <Link href="/letters/practice">
          <Button className="w-full" size="lg">
            תרגול נוסף
          </Button>
        </Link>
        <Link href="/letters">
          <Button variant="outline" className="w-full gap-2">
            <ArrowLeft className="size-4" />
            חזרה לאותיות
          </Button>
        </Link>
      </div>
    </div>
  );
}
