"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Mic, MicOff, Volume2, VolumeX, StopCircle, Loader2,
  ChevronDown, ChevronUp, ArrowRight, RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChatMessage, Scenario, ScenarioDifficulty } from "@/types";
import { DIFFICULTY_LABELS } from "@/types";
import Link from "next/link";

interface ISpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onresult: ((event: ISpeechRecognitionEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
  onend: (() => void) | null;
}

interface ISpeechRecognitionEvent {
  results: ISpeechRecognitionResultList;
}

interface ISpeechRecognitionResultList {
  readonly length: number;
  [index: number]: ISpeechRecognitionResult;
}

interface ISpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  [index: number]: ISpeechRecognitionAlternative;
}

interface ISpeechRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}

declare global {
  interface Window {
    SpeechRecognition: new () => ISpeechRecognition;
    webkitSpeechRecognition: new () => ISpeechRecognition;
  }
}

interface Props {
  scenario: Scenario;
  userId: string;
}

type Phase = "briefing" | "chat" | "feedback";

function useTTS() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const play = useCallback(async (text: string, lang = "ar") => {
    // Stop any current playback
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    if (!text.trim()) return;
    setIsPlaying(true);

    try {
      const res = await fetch("/api/ai/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, lang }),
      });

      if (!res.ok) {
        // Fallback to browser TTS
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang === "he" ? "he-IL" : "ar-SA";
        utterance.onend = () => setIsPlaying(false);
        window.speechSynthesis.speak(utterance);
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => {
        setIsPlaying(false);
        URL.revokeObjectURL(url);
        audioRef.current = null;
      };
      audio.onerror = () => {
        setIsPlaying(false);
        URL.revokeObjectURL(url);
        audioRef.current = null;
      };
      await audio.play();
    } catch {
      setIsPlaying(false);
    }
  }, []);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    window.speechSynthesis?.cancel();
    setIsPlaying(false);
  }, []);

  return { play, stop, isPlaying };
}

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
  const [speechSupported, setSpeechSupported] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<ISpeechRecognition | null>(null);
  const { play: playTTS, stop: stopTTS, isPlaying } = useTTS();

  const hints = (scenario.hints as string[] | null) ?? [];

  useEffect(() => {
    const SR = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!SR) setSpeechSupported(false);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loadingAI) return;
    setTranscript("");

    const userMsg: ChatMessage = { role: "user", content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setLoadingAI(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages,
          scenarioId: scenario.id,
          userId,
          sessionId,
        }),
      });

      if (!res.ok) throw new Error("שגיאה בשיחה עם AI");

      const data = await res.json();
      setSessionId(data.sessionId);
      const aiMsg: ChatMessage = { role: "assistant", content: data.text };
      setMessages([...newMessages, aiMsg]);

      if (autoPlay && data.text) {
        await playTTS(data.text, "ar");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "שגיאה");
      setMessages(newMessages);
    } finally {
      setLoadingAI(false);
    }
  }, [messages, sessionId, scenario.id, userId, autoPlay, loadingAI, playTTS]);

  function startRecording() {
    const SR = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!SR) {
      toast.error("הדפדפן אינו תומך בזיהוי קול. נסה Chrome.");
      return;
    }

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

      if (result.isFinal) {
        recognition.stop();
        sendMessage(text);
      }
    };

    recognition.onerror = () => {
      setIsRecording(false);
      setTranscript("");
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognition.start();
    setIsRecording(true);
  }

  function stopRecording() {
    recognitionRef.current?.stop();
    setIsRecording(false);
  }

  async function endSession() {
    if (messages.length === 0) {
      toast.info("אין הודעות בשיחה");
      return;
    }
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

      // Auto-play feedback in Hebrew
      if (data.feedback) {
        setTimeout(() => playTTS(data.feedback, "he"), 500);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "שגיאה");
    } finally {
      setLoadingFeedback(false);
    }
  }

  function resetSession() {
    stopTTS();
    stopRecording();
    setPhase("briefing");
    setMessages([]);
    setFeedback("");
    setSessionId(null);
    setTranscript("");
  }

  // ── Briefing phase ──────────────────────────────────────────────────────────
  if (phase === "briefing") {
    return (
      <div className="p-4 max-w-lg mx-auto space-y-5">
        <div className="flex items-center gap-2 pt-2">
          <Link href="/ai-practice" className="text-muted-foreground hover:text-foreground">
            <ArrowRight className="size-4" />
          </Link>
          <div className="flex-1">
            <h1 className="font-bold text-lg leading-tight">{scenario.name}</h1>
            {scenario.difficulty && (
              <Badge variant="outline" className="text-xs mt-0.5">
                {DIFFICULTY_LABELS[scenario.difficulty as ScenarioDifficulty]}
              </Badge>
            )}
          </div>
        </div>

        {scenario.student_description && (
          <Card>
            <CardContent className="p-4 text-sm leading-relaxed">
              {scenario.student_description}
            </CardContent>
          </Card>
        )}

        {scenario.student_role && (
          <div className="space-y-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">תפקידך בתרחיש</p>
            <p className="font-medium">{scenario.student_role}</p>
          </div>
        )}

        {hints.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              שלבי ההכוונה ({hints.length} שלבים)
            </p>
            <ol className="space-y-2.5">
              {hints.map((hint, i) => (
                <li key={i} className="flex gap-3 text-sm items-start">
                  <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <span>{hint}</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {!speechSupported && (
          <p className="text-xs text-amber-600 bg-amber-50 rounded-md p-2">
            הדפדפן שלך אינו תומך בזיהוי קול. תוכל להשתמש בקלט טקסט כחלופה.
          </p>
        )}

        <Button
          className="w-full gap-2"
          size="lg"
          onClick={() => setPhase("chat")}
        >
          <Mic className="size-4" />
          התחל שיחה
        </Button>
      </div>
    );
  }

  // ── Feedback phase ──────────────────────────────────────────────────────────
  if (phase === "feedback") {
    return (
      <div className="p-4 max-w-lg mx-auto space-y-4">
        <h1 className="text-xl font-bold pt-2">פידבק – {scenario.name}</h1>

        <Card>
          <CardContent className="p-4 text-sm leading-relaxed whitespace-pre-wrap">
            {feedback}
          </CardContent>
        </Card>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => isPlaying ? stopTTS() : playTTS(feedback, "he")}
          >
            {isPlaying ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
            {isPlaying ? "עצור" : "השמע פידבק"}
          </Button>
        </div>

        <Separator />

        <Button variant="outline" className="w-full gap-1.5" onClick={resetSession}>
          <RotateCcw className="size-4" />
          תרגול חדש
        </Button>
      </div>
    );
  }

  // ── Chat phase ──────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-svh">

      {/* Header */}
      <div className="p-3 border-b space-y-2 shrink-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Link href="/ai-practice" className="text-muted-foreground hover:text-foreground shrink-0">
              <ArrowRight className="size-4" />
            </Link>
            <p className="font-bold text-sm truncate">{scenario.name}</p>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Auto-play toggle */}
            <button
              onClick={() => setAutoPlay((v) => !v)}
              title={autoPlay ? "כבה השמעה אוטומטית" : "הפעל השמעה אוטומטית"}
              className={cn(
                "p-1.5 rounded-md transition-colors",
                autoPlay ? "text-primary" : "text-muted-foreground"
              )}
            >
              {autoPlay ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
            </button>

            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground gap-1"
              onClick={endSession}
              disabled={messages.length === 0 || loadingAI || loadingFeedback}
            >
              {loadingFeedback ? <Loader2 className="size-3 animate-spin" /> : <StopCircle className="size-3" />}
              סיים
            </Button>
          </div>
        </div>

        {/* Guidance steps – collapsible */}
        {hints.length > 0 && (
          <>
            <button
              onClick={() => setHintsOpen((o) => !o)}
              className="flex items-center gap-1.5 text-xs text-primary font-medium"
            >
              שלבי ההכוונה ({hints.length})
              {hintsOpen ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
            </button>
            {hintsOpen && (
              <ol className="text-xs space-y-1 border-s-2 border-primary/30 ps-3 pe-1">
                {hints.map((hint, i) => (
                  <li key={i} className="flex gap-1.5 text-muted-foreground">
                    <span className="font-semibold text-foreground shrink-0">{i + 1}.</span>
                    {hint}
                  </li>
                ))}
              </ol>
            )}
          </>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto min-h-0 p-4 space-y-3 no-scrollbar">
        {messages.length === 0 && (
          <div className="text-center text-sm text-muted-foreground py-10 space-y-1">
            <Mic className="size-8 mx-auto opacity-20" />
            <p>לחץ על הכפתור ודבר ערבית</p>
            <p className="text-xs">ה-AI יענה ויחזור אליך בקול</p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}
          >
            <div
              className={cn(
                "max-w-[82%] rounded-2xl px-4 py-2.5 text-sm",
                msg.role === "user"
                  ? "bg-primary text-primary-foreground rounded-ee-sm"
                  : "bg-muted rounded-es-sm"
              )}
              dir="rtl"
              lang={msg.role === "assistant" ? "ar" : undefined}
              style={msg.role === "assistant" ? { fontFamily: "var(--font-noto-arabic)" } : undefined}
            >
              {msg.content}
              {/* Replay TTS for individual AI messages */}
              {msg.role === "assistant" && (
                <button
                  onClick={() => isPlaying ? stopTTS() : playTTS(msg.content, "ar")}
                  className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  <Volume2 className="size-3" />
                </button>
              )}
            </div>
          </div>
        ))}

        {(loadingAI || isPlaying) && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-2xl rounded-es-sm px-4 py-3 flex items-center gap-2">
              {loadingAI ? (
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
              ) : (
                <>
                  <Volume2 className="size-4 text-primary animate-pulse" />
                  <span className="text-xs text-muted-foreground">מדבר...</span>
                </>
              )}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <Separator />

      {/* Voice input bar */}
      <div className="p-4 space-y-3 shrink-0">
        {/* Transcript preview */}
        {transcript && (
          <div className="text-sm text-center text-muted-foreground bg-muted/40 rounded-lg py-2 px-3" dir="rtl" lang="ar">
            {transcript}
          </div>
        )}

        {/* Mic button */}
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={loadingAI || isPlaying || loadingFeedback}
            className={cn(
              "w-16 h-16 rounded-full flex items-center justify-center transition-all shadow-lg",
              isRecording
                ? "bg-destructive text-destructive-foreground scale-110 animate-pulse"
                : loadingAI || isPlaying
                ? "bg-muted text-muted-foreground cursor-not-allowed"
                : "bg-primary text-primary-foreground hover:scale-105 active:scale-95"
            )}
          >
            {isRecording ? <MicOff className="size-6" /> : <Mic className="size-6" />}
          </button>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          {isRecording
            ? "מקשיב... לחץ שוב לסיום"
            : isPlaying
            ? "ה-AI מדבר..."
            : loadingAI
            ? "ממתין לתשובה..."
            : "לחץ ודבר ערבית"}
        </p>
      </div>
    </div>
  );
}
