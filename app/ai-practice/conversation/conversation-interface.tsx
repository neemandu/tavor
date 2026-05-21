"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Send, StopCircle, Loader2, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/types";
import { TTSButton } from "@/components/tts-button";

const TOTAL_SECONDS = 30 * 60; // 30 minutes

interface Props {
  userId: string;
}

type Phase = "chat" | "feedback";

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export function ConversationInterface({ userId }: Props) {
  const [phase, setPhase] = useState<Phase>("chat");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [loadingFeedback, setLoadingFeedback] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(TOTAL_SECONDS);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const endSession = useCallback(
    async (auto = false) => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      if (messages.length === 0) {
        if (!auto) toast.info("לא ניתן לסיים שיחה ריקה");
        return;
      }

      setLoadingFeedback(true);
      try {
        const res = await fetch("/api/ai/feedback-free", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages,
            sessionId,
            sessionType: "free_conversation",
          }),
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
    },
    [messages, sessionId]
  );

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          timerRef.current = null;
          endSession(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // Only run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = { role: "user", content: text };
    setInput("");
    setLoading(true);

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);

    try {
      const res = await fetch("/api/ai/free-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages,
          sessionId,
          sessionType: "free_conversation",
        }),
      });

      if (!res.ok) throw new Error("שגיאה בשיחה עם AI");

      const data = await res.json();
      setSessionId(data.sessionId);
      setMessages([...newMessages, { role: "assistant", content: data.text }]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "שגיאה");
      setMessages(newMessages);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  const isLowTime = timeLeft <= 5 * 60; // last 5 minutes

  if (phase === "feedback") {
    return (
      <div className="p-4 max-w-lg mx-auto space-y-4">
        <h1 className="text-xl font-bold pt-2">פידבק – שיחה חופשית</h1>
        <Card>
          <CardContent className="p-4 prose prose-sm max-w-none whitespace-pre-wrap leading-relaxed">
            {feedback}
          </CardContent>
        </Card>
        <TTSButton text={feedback} lang="he" />
        <Button
          variant="outline"
          className="w-full"
          onClick={() => {
            setPhase("chat");
            setMessages([]);
            setFeedback("");
            setSessionId(null);
            setTimeLeft(TOTAL_SECONDS);

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

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)]">
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between gap-2">
        <div>
          <h1 className="font-bold text-base">שיחה חופשית</h1>
          <p className="text-xs text-muted-foreground">שיחה פתוחה בערבית</p>
        </div>
        <Badge
          variant="outline"
          className={cn(
            "gap-1 text-sm font-mono shrink-0",
            isLowTime && timeLeft > 0 ? "border-orange-400 text-orange-600" : "",
            timeLeft === 0 ? "border-red-400 text-red-600" : ""
          )}
        >
          <Clock className="size-3.5" />
          {formatTime(timeLeft)}
        </Badge>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center text-sm text-muted-foreground py-8">
            <p>השיחה תתחיל כשתשלח הודעה ראשונה</p>
            <p className="text-xs mt-1">30 דקות של שיחה חופשית בערבית</p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={cn(
              "flex",
              msg.role === "user" ? "justify-end" : "justify-start"
            )}
          >
            <div
              className={cn(
                "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm",
                msg.role === "user"
                  ? "bg-primary text-primary-foreground rounded-ee-sm"
                  : "bg-muted rounded-es-sm"
              )}
              dir="rtl"
              lang={msg.role === "assistant" ? "ar" : undefined}
              style={
                msg.role === "assistant"
                  ? { fontFamily: "var(--font-noto-arabic)" }
                  : undefined
              }
            >
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-2xl rounded-es-sm px-4 py-2.5">
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <Separator />

      {/* Input area */}
      <div className="p-3 space-y-2">
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="הקלד הודעה..."
            className="resize-none min-h-[44px] max-h-[120px]"
            rows={1}
            disabled={loading || loadingFeedback || timeLeft === 0}
          />
          <Button
            size="icon"
            onClick={sendMessage}
            disabled={!input.trim() || loading || timeLeft === 0}
          >
            <Send className="size-4" />
          </Button>
        </div>

        <Button
          variant="outline"
          size="sm"
          className="w-full gap-1.5 text-muted-foreground"
          onClick={() => endSession(false)}
          disabled={messages.length === 0 || loading || loadingFeedback}
        >
          {loadingFeedback ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <StopCircle className="size-4" />
          )}
          {loadingFeedback ? "מכין פידבק..." : "סיים וקבל פידבק"}
        </Button>
      </div>
    </div>
  );
}
