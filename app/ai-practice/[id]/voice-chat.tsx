"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useTTS } from "@/hooks/use-tts";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import {
  Mic, Volume2,
  ChevronDown, ChevronUp, ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChatMessage, Scenario, ScenarioDifficulty } from "@/types";
import { DIFFICULTY_LABELS } from "@/types";
import Link from "next/link";
import { VoiceOrb, type OrbState } from "@/components/voice-orb";


function drainSentences(buf: string, final: boolean): [string[], string] {
  const sentences: string[] = [];
  let remaining = buf;
  let m = /[.!?؟]/.exec(remaining);
  while (m !== null) {
    const s = remaining.slice(0, m.index + 1).trim();
    remaining = remaining.slice(m.index + 1).replace(/^\s+/, "");
    if (s.length > 1) sentences.push(s);
    m = /[.!?؟]/.exec(remaining);
  }
  if (final && remaining.trim().length > 1) {
    sentences.push(remaining.trim());
    remaining = "";
  }
  return [sentences, remaining];
}

interface Props { scenario: Scenario; userId: string; }
type Phase = "briefing" | "chat" | "feedback";

export function VoiceChat({ scenario, userId }: Props) {
  const [phase, setPhase] = useState<Phase>("briefing");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [loadingAI, setLoadingAI] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [loadingFeedback, setLoadingFeedback] = useState(false);
  const [autoPlay, setAutoPlay] = useState(true);
  const [hintsOpen, setHintsOpen] = useState(false);
  const [conversationStarted, setConversationStarted] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<ISpeechRecognition | null>(null);
  const { play: playTTS, enqueue, stop: stopTTS, isPlaying } = useTTS();

  const hints = (scenario.hints as string[] | null) ?? [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loadingAI) return;
    setTranscript("");
    const userMsg: ChatMessage = { role: "user", content: text };
    const newMessages = [...messages, userMsg];
    setMessages([...newMessages, { role: "assistant", content: "" }]);
    setLoadingAI(true);

    let fullText = "";
    let sentenceBuf = "";

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages, scenarioId: scenario.id, userId, sessionId }),
      });
      if (!res.ok || !res.body) throw new Error("שגיאה בשיחה עם AI");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let sseBuffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        sseBuffer += decoder.decode(value, { stream: true });
        const events = sseBuffer.split("\n\n");
        sseBuffer = events.pop() ?? "";

        for (const event of events) {
          const dataLine = event.split("\n").find((l) => l.startsWith("data: "));
          if (!dataLine) continue;
          let parsed: Record<string, unknown>;
          try { parsed = JSON.parse(dataLine.slice(6)); } catch { continue; }
          if (parsed.error) throw new Error(parsed.error as string);
          if (parsed.text) {
            fullText += parsed.text as string;
            sentenceBuf += parsed.text as string;
            setMessages((prev) => { const c = [...prev]; c[c.length - 1] = { role: "assistant", content: fullText }; return c; });
            if (autoPlay) {
              const [sentences, remaining] = drainSentences(sentenceBuf, false);
              sentenceBuf = remaining;
              sentences.forEach((s) => enqueue(s));
            }
          }
          if (parsed.done) {
            if (autoPlay) {
              const [final] = drainSentences(sentenceBuf, true);
              final.forEach((s) => enqueue(s));
              sentenceBuf = "";
            }
            setSessionId(parsed.sessionId as string | null);
          }
        }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "שגיאה");
      setMessages(newMessages);
    } finally {
      setLoadingAI(false);
    }
  }, [messages, sessionId, scenario.id, userId, autoPlay, loadingAI, enqueue]);

  const startRecording = useCallback(() => {
    const SR = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!SR) { toast.error("הדפדפן אינו תומך בזיהוי קול. נסה Chrome."); return; }
    stopTTS();
    const recognition = new SR();
    recognition.lang = "ar-SA";
    recognition.continuous = false;
    recognition.interimResults = true;
    recognitionRef.current = recognition;
    recognition.onresult = (event: ISpeechRecognitionEvent) => {
      const result = event.results[event.results.length - 1];
      const text = result[0].transcript;
      setTranscript(text);
      if (result.isFinal) { recognition.stop(); sendMessage(text); }
    };
    recognition.onerror = () => { setIsRecording(false); setTranscript(""); };
    recognition.onend = () => { setIsRecording(false); };
    recognition.start();
    setIsRecording(true);
  }, [stopTTS, sendMessage]);

  const startRecordingRef = useRef(startRecording);
  useEffect(() => { startRecordingRef.current = startRecording; });

  // Auto-loop: re-activate mic after AI finishes speaking
  useEffect(() => {
    if (!conversationStarted || isRecording || loadingAI || isPlaying || !autoPlay) return;
    const t = setTimeout(() => startRecordingRef.current(), 400);
    return () => clearTimeout(t);
  }, [isPlaying, loadingAI, isRecording, conversationStarted, autoPlay]);

  function stopRecording() { recognitionRef.current?.stop(); setIsRecording(false); }

  function handleMicPress() {
    if (!conversationStarted) { setConversationStarted(true); startRecording(); return; }
    if (isPlaying) { stopTTS(); return; }
    if (isRecording) { stopRecording(); return; }
    startRecording();
  }

  async function endSession() {
    if (messages.length === 0) { toast.info("אין הודעות בשיחה"); return; }
    setConversationStarted(false);
    stopRecording();
    setLoadingFeedback(true);
    stopTTS();
    try {
      const res = await fetch("/api/ai/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages, scenarioId: scenario.id, sessionId, userId }),
      });
      if (!res.ok) throw new Error("שגיאה ביצירת פידבק");
      const data = await res.json();
      setFeedback(data.feedback);
      setPhase("feedback");
      if (data.feedback) setTimeout(() => playTTS(data.feedback, "he"), 500);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "שגיאה");
    } finally {
      setLoadingFeedback(false);
    }
  }

  function resetSession() {
    stopTTS(); stopRecording();
    setPhase("briefing"); setMessages([]); setFeedback("");
    setSessionId(null); setTranscript(""); setConversationStarted(false);
  }

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
                    <p key={i} className="text-sm text-muted-foreground">
                      {i + 1}. {hint}
                    </p>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        )}

        <Button
          className="w-full h-12 rounded-xl font-bold text-base gap-2"
          onClick={() => {
            setPhase("chat");
            setConversationStarted(true);
          }}
        >
          <Mic className="size-5" />
          התחל תרחיש
        </Button>
      </div>
    );
  }

  // ── Feedback ────────────────────────────────────────────────────────────────
  if (phase === "feedback") {
    return (
      <div className="p-5 max-w-lg mx-auto space-y-5">
        <div
          className="flex flex-col items-center pt-6 pb-2"
          style={{ animation: "celebrate 0.5s ease-out both" }}
        >
          <div className="w-16 h-16 rounded-full bg-[oklch(60%_0.22_145)] flex items-center justify-center mb-4">
            <span className="text-3xl text-white">✓</span>
          </div>
          <h1 className="text-xl font-black">פידבק – {scenario.name}</h1>
        </div>
        <Card className="rounded-2xl shadow-[var(--shadow-card)]">
          <CardContent className="p-5 text-sm leading-relaxed whitespace-pre-wrap">
            {feedback}
          </CardContent>
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
          <Button variant="outline" className="w-full rounded-xl">
            תרחיש חדש
          </Button>
        </Link>
      </div>
    );
  }

  // ── Chat (fullscreen orb) ────────────────────────────────────────────────────
  const orbState: OrbState =
    (loadingAI || loadingFeedback) && !isPlaying
      ? "loading"
      : isRecording
      ? "listening"
      : isPlaying
      ? "speaking"
      : "idle";

  const stateLabel = !conversationStarted
    ? "לחץ להתחלת שיחה"
    : isRecording
    ? "מקשיב..."
    : isPlaying
    ? "ה-AI מדבר..."
    : loadingAI
    ? "מעבד..."
    : "מתכונן להאזין...";

  return (
    <div className="fixed inset-0 bg-[#0A0A0A] flex flex-col overflow-hidden">
      {/* Minimal header */}
      <div className="flex items-center gap-3 px-4 pt-12 pb-4">
        <Link href="/ai-practice" className="text-white/60 hover:text-white/90">
          <ArrowRight className="size-5" />
        </Link>
        <span className="text-white/70 text-sm font-medium">{scenario.name}</span>
      </div>

      {/* Center */}
      <div className="flex-1 flex flex-col items-center justify-center gap-8 px-6">
        {transcript && (
          <p
            className="text-white/60 text-sm text-center max-w-xs"
            dir="rtl"
            lang="ar"
            style={{ fontFamily: "var(--font-noto-arabic)" }}
          >
            {transcript}
          </p>
        )}

        <VoiceOrb
          state={orbState}
          onClick={handleMicPress}
          disabled={false}
        />

        <div className="flex flex-col items-center gap-4">
          <p className="text-white text-lg font-semibold text-center">{stateLabel}</p>
          <button
            onClick={endSession}
            disabled={messages.length === 0 || loadingAI || loadingFeedback}
            className="text-white/50 text-sm underline underline-offset-2 disabled:opacity-20 transition-opacity"
          >
            {loadingFeedback ? "מכין פידבק..." : "סיים וקבל פידבק"}
          </button>
        </div>
      </div>
    </div>
  );
}
