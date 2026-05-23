"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Mic, MicOff, Volume2, VolumeX, StopCircle, Loader2, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/types";
import { TTSButton } from "@/components/tts-button";

interface ISpeechRecognition extends EventTarget {
  lang: string; continuous: boolean; interimResults: boolean;
  start(): void; stop(): void;
  onresult: ((e: ISpeechRecognitionEvent) => void) | null;
  onerror: ((e: Event) => void) | null;
  onend: (() => void) | null;
}
interface ISpeechRecognitionEvent { results: ISpeechRecognitionResultList; }
interface ISpeechRecognitionResultList { readonly length: number; [i: number]: ISpeechRecognitionResult; }
interface ISpeechRecognitionResult { readonly isFinal: boolean; readonly length: number; [i: number]: { readonly transcript: string }; }
declare global { interface Window { SpeechRecognition: new () => ISpeechRecognition; webkitSpeechRecognition: new () => ISpeechRecognition; } }

function useTTS() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const play = useCallback(async (text: string, lang = "ar") => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    if (!text.trim()) return;
    setIsPlaying(true);
    try {
      const res = await fetch("/api/ai/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, lang }),
      });
      if (!res.ok) {
        const u = new SpeechSynthesisUtterance(text);
        u.lang = lang === "he" ? "he-IL" : "ar-PS";
        u.onend = () => setIsPlaying(false);
        window.speechSynthesis.speak(u);
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => { setIsPlaying(false); URL.revokeObjectURL(url); audioRef.current = null; };
      audio.onerror = () => { setIsPlaying(false); URL.revokeObjectURL(url); audioRef.current = null; };
      await audio.play();
    } catch { setIsPlaying(false); }
  }, []);

  const stop = useCallback(() => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    window.speechSynthesis?.cancel();
    setIsPlaying(false);
  }, []);

  return { play, stop, isPlaying };
}

const TOTAL_SECONDS = 30 * 60;

function formatTime(s: number) {
  return `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;
}

interface Props { userId: string; }
type Phase = "chat" | "feedback";

export function ConversationInterface({ userId }: Props) {
  const [phase, setPhase] = useState<Phase>("chat");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [loadingFeedback, setLoadingFeedback] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(TOTAL_SECONDS);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [speechSupported, setSpeechSupported] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<ISpeechRecognition | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { play: playTTS, stop: stopTTS, isPlaying } = useTTS();

  useEffect(() => {
    const SR = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!SR) setSpeechSupported(false);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const endSession = useCallback(async (auto = false) => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (messages.length === 0) { if (!auto) toast.info("לא ניתן לסיים שיחה ריקה"); return; }
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
    setMessages(newMessages);
    setLoading(true);
    try {
      const res = await fetch("/api/ai/free-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages, sessionId, sessionType: "free_conversation" }),
      });
      if (!res.ok) throw new Error("שגיאה בשיחה עם AI");
      const data = await res.json();
      setSessionId(data.sessionId);
      const aiMsg: ChatMessage = { role: "assistant", content: data.text };
      setMessages([...newMessages, aiMsg]);
      if (data.text) await playTTS(data.text, "ar");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "שגיאה");
      setMessages(newMessages);
    } finally {
      setLoading(false);
    }
  }, [messages, sessionId, loading, playTTS]);

  function startRecording() {
    const SR = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!SR) { toast.error("הדפדפן אינו תומך בזיהוי קול. נסה Chrome."); return; }
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
  }

  function stopRecording() { recognitionRef.current?.stop(); setIsRecording(false); }

  const isLowTime = timeLeft <= 5 * 60;

  // ── Feedback ────────────────────────────────────────────────────────────────
  if (phase === "feedback") {
    return (
      <div className="p-5 max-w-lg mx-auto space-y-4">
        <h1 className="text-xl font-bold pt-2">פידבק – שיחה חופשית</h1>
        <Card>
          <CardContent className="p-4 text-sm leading-relaxed whitespace-pre-wrap">{feedback}</CardContent>
        </Card>
        <TTSButton text={feedback} lang="he" />
        <Button variant="outline" className="w-full" onClick={() => { setPhase("chat"); setMessages([]); setFeedback(""); setSessionId(null); setTimeLeft(TOTAL_SECONDS); timerRef.current = setInterval(() => { setTimeLeft((prev) => { if (prev <= 1) { clearInterval(timerRef.current!); timerRef.current = null; return 0; } return prev - 1; }); }, 1000); }}>
          שיחה חדשה
        </Button>
      </div>
    );
  }

  // ── Chat (voice) ─────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-svh">
      <div className="p-4 border-b flex items-center justify-between gap-2 shrink-0">
        <div>
          <h1 className="font-bold text-base">שיחה חופשית</h1>
          <p className="text-xs text-muted-foreground">ניב עזתי – דבר ערבית</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={cn("gap-1 text-sm font-mono", isLowTime && timeLeft > 0 ? "border-orange-400 text-orange-600" : "", timeLeft === 0 ? "border-destructive text-destructive" : "")}
          >
            <Clock className="size-3.5" />
            {formatTime(timeLeft)}
          </Badge>
          <Button
            variant="ghost" size="sm"
            className="text-xs text-muted-foreground gap-1"
            onClick={() => endSession(false)}
            disabled={messages.length === 0 || loading || loadingFeedback}
          >
            {loadingFeedback ? <Loader2 className="size-3 animate-spin" /> : <StopCircle className="size-3" />}
            סיים
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto min-h-0 p-4 space-y-3 no-scrollbar">
        {messages.length === 0 && (
          <div className="text-center text-sm text-muted-foreground py-10 space-y-1">
            <Mic className="size-8 mx-auto opacity-20" />
            <p>לחץ על הכפתור ודבר ערבית</p>
            <p className="text-xs">30 דקות של שיחה חופשית בניב עזתי</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
            <div
              className={cn(
                "max-w-[82%] rounded-2xl px-4 py-2.5 text-sm",
                msg.role === "user" ? "bg-primary text-primary-foreground rounded-ee-sm" : "bg-muted rounded-es-sm"
              )}
              dir="rtl"
              lang={msg.role === "assistant" ? "ar" : undefined}
              style={msg.role === "assistant" ? { fontFamily: "var(--font-noto-arabic)" } : undefined}
            >
              {msg.content}
              {msg.role === "assistant" && (
                <button onClick={() => isPlaying ? stopTTS() : playTTS(msg.content, "ar")} className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                  <Volume2 className="size-3" />
                </button>
              )}
            </div>
          </div>
        ))}
        {(loading || isPlaying) && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-2xl rounded-es-sm px-4 py-3 flex items-center gap-2">
              {loading ? <Loader2 className="size-4 animate-spin text-muted-foreground" /> : <><Volume2 className="size-4 text-primary animate-pulse" /><span className="text-xs text-muted-foreground">מדבר...</span></>}
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <Separator />

      {/* Voice input */}
      <div className="p-4 space-y-3 shrink-0">
        {transcript && (
          <div className="text-sm text-center text-muted-foreground bg-muted/40 rounded-lg py-2 px-3" dir="rtl" lang="ar">
            {transcript}
          </div>
        )}
        <div className="flex items-center justify-center">
          <button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={loading || isPlaying || loadingFeedback || timeLeft === 0}
            className={cn(
              "w-16 h-16 rounded-full flex items-center justify-center transition-all shadow-lg",
              isRecording ? "bg-destructive text-destructive-foreground scale-110 animate-pulse"
                : loading || isPlaying || timeLeft === 0 ? "bg-muted text-muted-foreground cursor-not-allowed"
                : "bg-primary text-primary-foreground hover:scale-105 active:scale-95"
            )}
          >
            {isRecording ? <MicOff className="size-6" /> : <Mic className="size-6" />}
          </button>
        </div>
        <p className="text-center text-xs text-muted-foreground">
          {timeLeft === 0 ? "הזמן נגמר" : isRecording ? "מקשיב... לחץ שוב לסיום" : isPlaying ? "ה-AI מדבר..." : loading ? "ממתין לתשובה..." : "לחץ ודבר ערבית"}
        </p>
      </div>
    </div>
  );
}
