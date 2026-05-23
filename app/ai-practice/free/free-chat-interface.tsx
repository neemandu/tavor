"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Mic, MicOff, Volume2, StopCircle, Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/types";
import { TTSButton } from "@/components/tts-button";
import { useTTS } from "@/hooks/use-tts";

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


interface Props { userId: string; }
type Phase = "setup" | "chat" | "feedback";

export function FreeChatInterface({ userId }: Props) {
  const [phase, setPhase] = useState<Phase>("setup");
  const [description, setDescription] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [loadingFeedback, setLoadingFeedback] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [speechSupported, setSpeechSupported] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<ISpeechRecognition | null>(null);
  const { play: playTTS, stop: stopTTS, isPlaying } = useTTS();

  useEffect(() => {
    const SR = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!SR) setSpeechSupported(false);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
        body: JSON.stringify({ messages: newMessages, description: description.trim(), sessionId, sessionType: "free_practice" }),
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
  }, [messages, description, sessionId, loading, playTTS]);

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

  async function endSession() {
    if (messages.length === 0) { toast.info("לא ניתן לסיים שיחה ריקה"); return; }
    setLoadingFeedback(true);
    stopTTS();
    try {
      const res = await fetch("/api/ai/feedback-free", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages, sessionId, sessionType: "free_practice" }),
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
  }

  // ── Setup ───────────────────────────────────────────────────────────────────
  if (phase === "setup") {
    return (
      <div className="p-5 max-w-lg mx-auto space-y-5">
        <div className="pt-2">
          <h1 className="text-xl font-bold">תרגול חופשי</h1>
          <p className="text-sm text-muted-foreground mt-1">תאר את הסיטואציה שתרצה לתרגל — ה-AI ישחק את הצד הערבי</p>
        </div>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="לדוגמה: אני נכנס לחנות בגדים ורוצה לקנות חולצה"
          className="resize-none min-h-[120px]"
          dir="rtl"
        />
        {!speechSupported && (
          <p className="text-xs text-amber-600 bg-amber-50 rounded-md p-2">
            הדפדפן שלך אינו תומך בזיהוי קול. נסה Chrome.
          </p>
        )}
        <Button className="w-full gap-2" onClick={() => { if (!description.trim()) { toast.error("נא לתאר את הסיטואציה"); return; } setPhase("chat"); }}>
          <Mic className="size-4" />
          התחל שיחה קולית
        </Button>
      </div>
    );
  }

  // ── Feedback ────────────────────────────────────────────────────────────────
  if (phase === "feedback") {
    return (
      <div className="p-5 max-w-lg mx-auto space-y-4">
        <h1 className="text-xl font-bold pt-2">פידבק – תרגול חופשי</h1>
        <Card>
          <CardContent className="p-4 text-sm leading-relaxed whitespace-pre-wrap">{feedback}</CardContent>
        </Card>
        <TTSButton text={feedback} lang="he" />
        <Button variant="outline" className="w-full" onClick={() => { setPhase("setup"); setMessages([]); setFeedback(""); setSessionId(null); setDescription(""); }}>
          תרגול חדש
        </Button>
      </div>
    );
  }

  // ── Chat (voice) ─────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-svh">
      <div className="p-4 border-b flex items-center justify-between gap-2 shrink-0">
        <div>
          <h1 className="font-bold text-base">תרגול חופשי</h1>
          <p className="text-xs text-muted-foreground line-clamp-1">{description}</p>
        </div>
        <Button
          variant="ghost" size="sm"
          className="text-xs text-muted-foreground gap-1 shrink-0"
          onClick={endSession}
          disabled={messages.length === 0 || loading || loadingFeedback}
        >
          {loadingFeedback ? <Loader2 className="size-3 animate-spin" /> : <StopCircle className="size-3" />}
          סיים
        </Button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto min-h-0 p-4 space-y-3 no-scrollbar">
        {messages.length === 0 && (
          <div className="text-center text-sm text-muted-foreground py-10 space-y-1">
            <Mic className="size-8 mx-auto opacity-20" />
            <p>לחץ על הכפתור ודבר ערבית</p>
            <p className="text-xs">ה-AI ישיב ויחזור אליך בקול</p>
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
            disabled={loading || isPlaying || loadingFeedback}
            className={cn(
              "w-16 h-16 rounded-full flex items-center justify-center transition-all shadow-lg",
              isRecording ? "bg-destructive text-destructive-foreground scale-110 animate-pulse"
                : loading || isPlaying ? "bg-muted text-muted-foreground cursor-not-allowed"
                : "bg-primary text-primary-foreground hover:scale-105 active:scale-95"
            )}
          >
            {isRecording ? <MicOff className="size-6" /> : <Mic className="size-6" />}
          </button>
        </div>
        <p className="text-center text-xs text-muted-foreground">
          {isRecording ? "מקשיב... לחץ שוב לסיום" : isPlaying ? "ה-AI מדבר..." : loading ? "ממתין לתשובה..." : "לחץ ודבר ערבית"}
        </p>
      </div>
    </div>
  );
}
