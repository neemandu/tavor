"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Send, StopCircle, Loader2, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/types";
import { TTSButton } from "@/components/tts-button";

interface Props {
  userId: string;
}

type Phase = "setup" | "chat" | "feedback";

export function FreeChatInterface({ userId }: Props) {
  const [phase, setPhase] = useState<Phase>("setup");
  const [description, setDescription] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [loadingFeedback, setLoadingFeedback] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function startPractice() {
    const desc = description.trim();
    if (!desc) {
      toast.error("נא לתאר את הסיטואציה לפני שמתחילים");
      return;
    }
    setPhase("chat");
  }

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
          description: description.trim(),
          sessionId,
          sessionType: "free_practice",
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

  async function endSession() {
    if (messages.length === 0) {
      toast.info("לא ניתן לסיים שיחה ריקה");
      return;
    }
    setLoadingFeedback(true);
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

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  if (phase === "setup") {
    return (
      <div className="p-4 max-w-lg mx-auto space-y-5">
        <div className="pt-2">
          <h1 className="text-xl font-bold">תרגול חופשי</h1>
          <p className="text-sm text-muted-foreground">תאר את הסיטואציה שתרצה לתרגל</p>
        </div>

        <div className="space-y-3">
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="לדוגמה: אני נכנס לחנות בגדים ורוצה לקנות חולצה"
            className="resize-none min-h-[120px]"
            dir="rtl"
          />
          <Button className="w-full gap-2" onClick={startPractice}>
            התחל תרגול
            <ArrowRight className="size-4" />
          </Button>
        </div>
      </div>
    );
  }

  if (phase === "feedback") {
    return (
      <div className="p-4 max-w-lg mx-auto space-y-4">
        <h1 className="text-xl font-bold pt-2">פידבק – תרגול חופשי</h1>
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
            setPhase("setup");
            setMessages([]);
            setFeedback("");
            setSessionId(null);
            setDescription("");
          }}
        >
          תרגול חדש
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)]">
      {/* Header */}
      <div className="p-4 border-b space-y-1">
        <h1 className="font-bold text-base">תרגול חופשי</h1>
        <p className="text-xs text-muted-foreground line-clamp-2">{description}</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center text-sm text-muted-foreground py-8">
            <p>השיחה תתחיל כשתשלח הודעה ראשונה</p>
            <p className="text-xs mt-1">הקלד בערבית או עברית</p>
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
            disabled={loading || loadingFeedback}
          />
          <Button
            size="icon"
            onClick={sendMessage}
            disabled={!input.trim() || loading}
          >
            <Send className="size-4" />
          </Button>
        </div>

        <Button
          variant="outline"
          size="sm"
          className="w-full gap-1.5 text-muted-foreground"
          onClick={endSession}
          disabled={messages.length === 0 || loading || loadingFeedback}
        >
          {loadingFeedback ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <StopCircle className="size-4" />
          )}
          {loadingFeedback ? "מכין פידבק..." : "סיים ופידבק"}
        </Button>
      </div>
    </div>
  );
}
