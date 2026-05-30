"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Volume2, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTTS } from "@/hooks/use-tts";
import { useConvai } from "@/hooks/use-convai";
import { VoiceOrb } from "@/components/voice-orb";

const TOTAL_SECONDS = 30 * 60;
function formatTime(s: number) {
  return `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;
}

interface Props { userId: string; }
type Phase = "chat" | "feedback";

export function ConversationInterface({ userId: _userId }: Props) {
  const [phase, setPhase] = useState<Phase>("chat");
  const [feedback, setFeedback] = useState("");
  const [loadingFeedback, setLoadingFeedback] = useState(false);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [systemPrompt, setSystemPrompt] = useState<string | undefined>();
  const [timeLeft, setTimeLeft] = useState(TOTAL_SECONDS);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { play: playTTS, stop: stopTTS, isPlaying } = useTTS();

  const handleConversationEnd = useCallback(async (conversationId: string) => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    setLoadingFeedback(true);
    stopTTS();
    try {
      const res = await fetch("/api/ai/convai-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, sessionType: "free_conversation" }),
      });
      if (!res.ok) throw new Error("שגיאה ביצירת פידבק");
      const data = await res.json();
      if (!data.feedback) { toast.error("לא הייתה שיחה לנתח"); setPhase("chat"); return; }
      setFeedback(data.feedback);
      setPhase("feedback");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "שגיאה");
    } finally {
      setLoadingFeedback(false);
    }
  }, [stopTTS, playTTS]);

  const { orbState, transcript, endSession } = useConvai({
    signedUrl,
    systemPrompt,
    onEnd: handleConversationEnd,
  });

  // Start immediately on mount
  useEffect(() => {
    fetch("/api/ai/convai-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionType: "free_conversation" }),
    })
      .then((r) => r.json())
      .then((d) => { setSystemPrompt(d.systemPrompt); setSignedUrl(d.signedUrl); })
      .catch(() => toast.error("שגיאה בהתחברות"));
  }, []);

  // Timer
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          timerRef.current = null;
          endSession();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isLowTime = timeLeft <= 5 * 60;

  // ── Feedback ────────────────────────────────────────────────────────────────
  if (phase === "feedback") {
    return (
      <div className="p-5 max-w-lg mx-auto space-y-5">
        <div className="flex flex-col items-center pt-6 pb-2" style={{ animation: "celebrate 0.5s ease-out both" }}>
          <div className="w-16 h-16 rounded-full bg-[oklch(60%_0.22_145)] flex items-center justify-center mb-4">
            <span className="text-3xl text-white">✓</span>
          </div>
          <h1 className="text-xl font-black">פידבק – שיחה חופשית</h1>
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
        <Button
          variant="outline"
          className="w-full rounded-xl"
          onClick={() => {
            stopTTS();
            setPhase("chat");
            setFeedback("");
            setTimeLeft(TOTAL_SECONDS);
            setSignedUrl(null);
            // Restart session
            fetch("/api/ai/convai-token", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ sessionType: "free_conversation" }),
            })
              .then((r) => r.json())
              .then((d) => { setSystemPrompt(d.systemPrompt); setSignedUrl(d.signedUrl); })
              .catch(() => toast.error("שגיאה בהתחברות"));
          }}
        >
          שיחה חדשה
        </Button>
      </div>
    );
  }

  // ── Chat ────────────────────────────────────────────────────────────────────
  const stateLabel = loadingFeedback
    ? "מכין פידבק..."
    : timeLeft === 0
    ? "הזמן נגמר"
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
        <Clock className={cn("size-4", isLowTime && timeLeft > 0 ? "text-primary" : timeLeft === 0 ? "text-destructive" : "text-white/50")} />
        <span className={cn("text-sm font-mono", isLowTime && timeLeft > 0 ? "text-primary" : timeLeft === 0 ? "text-destructive" : "text-white/50")}>
          {formatTime(timeLeft)}
        </span>
        <span className="text-white/50 text-sm me-auto">שיחה חופשית · ניב עזתי</span>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-8 px-6">
        {transcript && (
          <p className="text-white/60 text-sm text-center max-w-xs" dir="rtl" lang="ar" style={{ fontFamily: "var(--font-noto-arabic)" }}>
            {transcript}
          </p>
        )}

        <VoiceOrb state={orbState} onClick={() => {}} disabled={timeLeft === 0} />

        <div className="flex flex-col items-center gap-4">
          <p className="text-white text-lg font-semibold text-center">{stateLabel}</p>
          <button
            onClick={endSession}
            disabled={loadingFeedback || orbState === "loading"}
            className="text-white/50 text-sm underline underline-offset-2 disabled:opacity-20 transition-opacity"
          >
            {loadingFeedback ? "מכין פידבק..." : "סיים וקבל פידבק"}
          </button>
        </div>
      </div>
    </div>
  );
}
