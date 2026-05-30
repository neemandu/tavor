"use client";

import { useState, useCallback } from "react";
import { useTTS } from "@/hooks/use-tts";
import { useConvai } from "@/hooks/use-convai";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { ChevronDown, ChevronUp, ArrowRight, Volume2 } from "lucide-react";
import type { Scenario, ScenarioDifficulty } from "@/types";
import { DIFFICULTY_LABELS } from "@/types";
import Link from "next/link";
import { VoiceOrb } from "@/components/voice-orb";
import { ClueChecklist } from "./clue-checklist";

interface Props { scenario: Scenario; userId: string; }
type Phase = "briefing" | "chat" | "feedback";

export function VoiceChat({ scenario, userId: _userId }: Props) {
  const [phase, setPhase] = useState<Phase>("briefing");
  const [feedback, setFeedback] = useState("");
  const [loadingFeedback, setLoadingFeedback] = useState(false);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [systemPrompt, setSystemPrompt] = useState<string | undefined>();
  const [starting, setStarting] = useState(false);
  const [hintsOpen, setHintsOpen] = useState(false);

  const { play: playTTS, stop: stopTTS, isPlaying } = useTTS();

  const handleConversationEnd = useCallback(async (conversationId: string) => {
    setLoadingFeedback(true);
    stopTTS();
    try {
      const res = await fetch("/api/ai/convai-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, scenarioId: scenario.id, sessionType: "scenario" }),
      });
      if (!res.ok) throw new Error("שגיאה ביצירת פידבק");
      const data = await res.json();
      if (!data.feedback) { toast.error("לא הייתה שיחה לנתח"); setPhase("briefing"); return; }
      setFeedback(data.feedback);
      setPhase("feedback");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "שגיאה");
    } finally {
      setLoadingFeedback(false);
    }
  }, [scenario.id, stopTTS, playTTS]);

  const { orbState, transcript, endSession } = useConvai({
    signedUrl,
    systemPrompt,
    onEnd: handleConversationEnd,
  });

  async function startChat() {
    setStarting(true);
    try {
      const res = await fetch("/api/ai/convai-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenarioId: scenario.id, sessionType: "scenario" }),
      });
      if (!res.ok) throw new Error("שגיאה בהתחברות");
      const data = await res.json();
      setSystemPrompt(data.systemPrompt);
      setSignedUrl(data.signedUrl);
      setPhase("chat");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "שגיאה");
    } finally {
      setStarting(false);
    }
  }

  const hints = (scenario.hints as string[] | null) ?? [];
  const difficultyColors: Record<string, string> = {
    easy: "bg-green-100 text-green-700",
    medium: "bg-yellow-100 text-yellow-700",
    hard: "bg-red-100 text-red-700",
  };

  // ── Briefing ────────────────────────────────────────────────────────────────
  if (phase === "briefing") {
    return (
      <div className="p-5 max-w-lg mx-auto space-y-5">
        <div className="pt-2">
          <h1 className="text-2xl font-black">{scenario.name}</h1>
          {scenario.difficulty && (
            <span className={`inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded-full ${difficultyColors[scenario.difficulty as ScenarioDifficulty]}`}>
              {DIFFICULTY_LABELS[scenario.difficulty as ScenarioDifficulty]}
            </span>
          )}
        </div>

        <Card className="rounded-2xl border-s-4 border-s-primary shadow-[var(--shadow-card)]">
          <CardContent className="p-5 space-y-3">
            {scenario.student_description && (
              <p className="text-sm leading-relaxed">{scenario.student_description}</p>
            )}
            {scenario.student_role && (
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1">התפקיד שלך</p>
                <p className="text-sm font-medium">{scenario.student_role}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {hints.length > 0 && (
          <div>
            <button
              onClick={() => setHintsOpen((o) => !o)}
              className="flex items-center gap-1.5 text-sm font-semibold text-primary mb-2"
            >
              {hintsOpen ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
              רמזים ({hints.length})
            </button>
            {hintsOpen && (
              <Card className="rounded-2xl">
                <CardContent className="p-4 space-y-2">
                  {hints.map((hint, i) => (
                    <p key={i} className="text-sm text-muted-foreground">{i + 1}. {hint}</p>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        )}

        <Button className="w-full h-12 rounded-xl font-bold text-base" onClick={startChat} disabled={starting}>
          {starting ? "מתחבר..." : "התחל תרחיש"}
        </Button>
      </div>
    );
  }

  // ── Feedback ────────────────────────────────────────────────────────────────
  if (phase === "feedback") {
    return (
      <div className="p-5 max-w-lg mx-auto space-y-5">
        <div className="flex flex-col items-center pt-6 pb-2" style={{ animation: "celebrate 0.5s ease-out both" }}>
          <div className="w-16 h-16 rounded-full bg-[oklch(60%_0.22_145)] flex items-center justify-center mb-4">
            <span className="text-3xl text-white">✓</span>
          </div>
          <h1 className="text-xl font-black">פידבק – {scenario.name}</h1>
        </div>
        <Card className="rounded-2xl shadow-[var(--shadow-card)]">
          <CardContent className="p-5 text-sm leading-relaxed whitespace-pre-wrap">{feedback}</CardContent>
        </Card>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 rounded-xl"
          onClick={() => (isPlaying ? stopTTS() : playTTS(feedback, "he"))}
        >
          {isPlaying ? (
            <><Volume2 className="size-4 animate-pulse" /> עצור</>
          ) : (
            <><Volume2 className="size-4" /> השמע פידבק בעברית</>
          )}
        </Button>
        <Link href="/ai-practice">
          <Button variant="outline" className="w-full rounded-xl">תרחיש חדש</Button>
        </Link>
      </div>
    );
  }

  // ── Chat ────────────────────────────────────────────────────────────────────
  const stateLabel = loadingFeedback
    ? "מכין פידבק..."
    : orbState === "loading"
    ? "מתחבר..."
    : orbState === "listening"
    ? "מקשיב..."
    : orbState === "speaking"
    ? "ה-AI מדבר..."
    : "ממתין";

  return (
    <div className="fixed inset-0 bg-[#0A0A0A] flex flex-col overflow-hidden">
      <div className="flex items-center gap-3 px-4 pt-12 pb-4">
        <Link href="/ai-practice" className="text-white/60 hover:text-white/90">
          <ArrowRight className="size-5" />
        </Link>
        <span className="text-white/70 text-sm font-medium">{scenario.name}</span>
      </div>

      <ClueChecklist hints={hints} />

      <div className="flex-1 flex flex-col items-center justify-center gap-8 px-6">
        {transcript && (
          <p className="text-white/60 text-sm text-center max-w-xs" dir="rtl" lang="ar" style={{ fontFamily: "var(--font-noto-arabic)" }}>
            {transcript}
          </p>
        )}

        <VoiceOrb state={orbState} onClick={() => {}} disabled={false} />

        <div className="flex flex-col items-center gap-4">
          <p className="text-white text-lg font-semibold text-center">{stateLabel}</p>
          <button
            onClick={endSession}
            disabled={loadingFeedback}
            className="text-white/50 text-sm underline underline-offset-2 disabled:opacity-20 transition-opacity"
          >
            {loadingFeedback ? "מכין פידבק..." : "סיים וקבל פידבק"}
          </button>
        </div>
      </div>
    </div>
  );
}
