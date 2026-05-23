"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Volume2, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/types";
import { useTTS } from "@/hooks/use-tts";
import { VoiceOrb, type OrbState } from "@/components/voice-orb";


function drainSentences(buf: string, final: boolean): [string[], string] {
  const sentences: string[] = [];
  let remaining = buf;
  let m = /[.!?؟،,]/.exec(remaining);
  while (m !== null) {
    const s = remaining.slice(0, m.index + 1).trim();
    const isComma = m[0] === "،" || m[0] === ",";
    remaining = remaining.slice(m.index + 1).replace(/^\s+/, "");
    if (isComma ? s.length >= 15 : s.length > 1) sentences.push(s);
    m = /[.!?؟،,]/.exec(remaining);
  }
  if (final && remaining.trim().length > 1) {
    sentences.push(remaining.trim());
    remaining = "";
  }
  return [sentences, remaining];
}

const TOTAL_SECONDS = 30 * 60;
function formatTime(s: number) {
  return `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;
}

interface Props { userId: string; }
type Phase = "chat" | "feedback";

export function ConversationInterface({ userId: _userId }: Props) {
  const [phase, setPhase] = useState<Phase>("chat");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [loadingFeedback, setLoadingFeedback] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(TOTAL_SECONDS);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [conversationStarted, setConversationStarted] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<ISpeechRecognition | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { play: playTTS, enqueue, stop: stopTTS, isPlaying } = useTTS();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const endSession = useCallback(async (auto = false) => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (messages.length === 0) { if (!auto) toast.info("לא ניתן לסיים שיחה ריקה"); return; }
    setConversationStarted(false);
    setLoadingFeedback(true);
    stopTTS();
    try {
      const res = await fetch("/api/ai/feedback-free", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages, sessionId, sessionType: "free_conversation" }),
      });
      if (!res.ok) throw new Error("שגיאה ביצירת פידבק");
      const data = await res.json();
      setFeedback(data.feedback);
      setPhase("feedback");
      if (data.feedback) setTimeout(() => playTTS(data.feedback, "he"), 400);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "שגיאה");
    } finally {
      setLoadingFeedback(false);
    }
  }, [messages, sessionId, stopTTS]);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) { clearInterval(timerRef.current!); timerRef.current = null; endSession(true); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;
    setTranscript("");
    const userMsg: ChatMessage = { role: "user", content: text };
    const newMessages = [...messages, userMsg];
    setMessages([...newMessages, { role: "assistant", content: "" }]);
    setLoading(true);

    let fullText = "";
    let sentenceBuf = "";

    try {
      const res = await fetch("/api/ai/free-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages, sessionId, sessionType: "free_conversation" }),
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
            const [sentences, remaining] = drainSentences(sentenceBuf, false);
            sentenceBuf = remaining;
            sentences.forEach((s) => enqueue(s));
          }
          if (parsed.done) {
            const [final] = drainSentences(sentenceBuf, true);
            final.forEach((s) => enqueue(s));
            sentenceBuf = "";
            setSessionId(parsed.sessionId as string | null);
          }
        }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "שגיאה");
      setMessages(newMessages);
    } finally {
      setLoading(false);
    }
  }, [messages, sessionId, loading, enqueue]);

  const startRecording = useCallback(() => {
    const SR = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!SR) { toast.error("הדפדפן אינו תומך בזיהוי קול. נסה Chrome."); return; }
    if (timeLeft === 0) return;
    stopTTS();
    const recognition = new SR();
    recognition.lang = "ar-PS";
    recognition.continuous = false;
    recognition.interimResults = true;
    recognitionRef.current = recognition;
    recognition.onresult = (e: ISpeechRecognitionEvent) => {
      const result = e.results[e.results.length - 1];
      const text = result[0].transcript;
      setTranscript(text);
      if (result.isFinal) { recognition.stop(); sendMessage(text); }
    };
    recognition.onerror = () => { setIsRecording(false); setTranscript(""); };
    recognition.onend = () => { setIsRecording(false); };
    recognition.start();
    setIsRecording(true);
  }, [stopTTS, sendMessage, timeLeft]);

  const startRecordingRef = useRef(startRecording);
  useEffect(() => { startRecordingRef.current = startRecording; });

  // Auto-loop: re-activate mic after AI finishes speaking
  useEffect(() => {
    if (!conversationStarted || isRecording || loading || isPlaying || timeLeft === 0) return;
    const t = setTimeout(() => startRecordingRef.current(), 150);
    return () => clearTimeout(t);
  }, [isPlaying, loading, isRecording, conversationStarted, timeLeft]);

  function stopRecording() { recognitionRef.current?.stop(); setIsRecording(false); }

  function handleMicPress() {
    if (timeLeft === 0) return;
    if (!conversationStarted) { setConversationStarted(true); startRecording(); return; }
    if (isPlaying) { stopTTS(); return; }
    if (isRecording) { stopRecording(); return; }
    startRecording();
  }

  const isLowTime = timeLeft <= 5 * 60;

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
          <h1 className="text-xl font-black">פידבק – שיחה חופשית</h1>
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
            <>
              <Volume2 className="size-4 animate-pulse" /> עצור
            </>
          ) : (
            <>
              <Volume2 className="size-4" /> השמע פידבק בעברית
            </>
          )}
        </Button>
        <Button
          variant="outline"
          className="w-full rounded-xl"
          onClick={() => {
            stopTTS();
            setPhase("chat");
            setMessages([]);
            setFeedback("");
            setSessionId(null);
            setTimeLeft(TOTAL_SECONDS);
            setConversationStarted(false);
            timerRef.current = setInterval(() => {
              setTimeLeft((prev) => {
                if (prev <= 1) {
                  clearInterval(timerRef.current!);
                  timerRef.current = null;
                  return 0;
                }
                return prev - 1;
              });
            }, 1000);
          }}
        >
          שיחה חדשה
        </Button>
      </div>
    );
  }

  // ── Chat (fullscreen orb) ────────────────────────────────────────────────────
  const orbState: OrbState =
    (loading || loadingFeedback) && !isPlaying
      ? "loading"
      : isRecording
      ? "listening"
      : isPlaying
      ? "speaking"
      : "idle";

  const stateLabel =
    timeLeft === 0
      ? "הזמן נגמר"
      : !conversationStarted
      ? "לחץ להתחלת שיחה"
      : isRecording
      ? "מקשיב..."
      : isPlaying
      ? "ה-AI מדבר..."
      : loading
      ? "מעבד..."
      : "מתכונן להאזין...";

  return (
    <div className="fixed inset-0 bg-[#0A0A0A] flex flex-col overflow-hidden">
      {/* Minimal header */}
      <div className="flex items-center gap-3 px-4 pt-12 pb-4">
        <Clock
          className={cn(
            "size-4",
            isLowTime && timeLeft > 0
              ? "text-primary"
              : timeLeft === 0
              ? "text-destructive"
              : "text-white/50"
          )}
        />
        <span
          className={cn(
            "text-sm font-mono",
            isLowTime && timeLeft > 0
              ? "text-primary"
              : timeLeft === 0
              ? "text-destructive"
              : "text-white/50"
          )}
        >
          {formatTime(timeLeft)}
        </span>
        <span className="text-white/50 text-sm me-auto">שיחה חופשית · ניב עזתי</span>
      </div>

      {/* Center */}
      <div className="flex-1 flex flex-col items-center justify-center gap-8 px-6">
        {/* Transcript */}
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
          disabled={timeLeft === 0}
        />

        <div className="flex flex-col items-center gap-4">
          <p className="text-white text-lg font-semibold text-center">{stateLabel}</p>
          <button
            onClick={() => endSession(false)}
            disabled={messages.length === 0 || loading || loadingFeedback}
            className="text-white/50 text-sm underline underline-offset-2 disabled:opacity-20 transition-opacity"
          >
            {loadingFeedback ? "מכין פידבק..." : "סיים וקבל פידבק"}
          </button>
        </div>
      </div>
    </div>
  );
}
