"use client";

import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Volume2 } from "lucide-react";
import { useTTS } from "@/hooks/use-tts";
import { cn } from "@/lib/utils";

type SessionType = "scenario" | "free_practice" | "free_conversation";

type Session = {
  id: string;
  session_type: SessionType;
  started_at: string;
  ended_at: string | null;
  feedback_text: string | null;
  messages: { role: string; content: string }[] | null;
  scenario_name: string | null;
};

const TYPE_LABELS: Record<SessionType, string> = {
  scenario: "תרחיש",
  free_practice: "תרגול חופשי",
  free_conversation: "שיחה חופשית",
};

const TYPE_COLORS: Record<SessionType, string> = {
  scenario: "bg-primary/10 text-primary",
  free_practice: "bg-teal-100 text-teal-700",
  free_conversation: "bg-indigo-100 text-indigo-700",
};

function relativeDate(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return "היום";
  if (days === 1) return "אתמול";
  return `לפני ${days} ימים`;
}

function formatDuration(start: string, end: string | null): string {
  if (!end) return "—";
  const minutes = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60_000);
  return `${minutes} דק'`;
}

interface Props {
  sessions: Session[];
}

export function SessionHistory({ sessions }: Props) {
  const [openId, setOpenId] = useState<string | null>(null);
  const { play: playTTS, stop: stopTTS, isPlaying } = useTTS();

  const openSession = sessions.find((s) => s.id === openId) ?? null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <p className="text-sm font-semibold text-muted-foreground">שיחות אחרונות</p>
        <Badge variant="outline" className="text-xs rounded-full">
          {sessions.length}
        </Badge>
      </div>

      {sessions.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-6">
          עדיין לא ניהלת שיחות
        </p>
      )}

      {sessions.map((session) => {
        const hasFeedback = !!session.feedback_text;
        const preview = session.feedback_text
          ? session.feedback_text.slice(0, 80) + (session.feedback_text.length > 80 ? "…" : "")
          : null;

        return (
          <button
            key={session.id}
            onClick={() => hasFeedback && setOpenId(session.id)}
            disabled={!hasFeedback}
            className={cn(
              "w-full text-start rounded-2xl border border-border p-4 space-y-2 transition-colors shadow-[var(--shadow-card)]",
              hasFeedback
                ? "hover:bg-muted/40 cursor-pointer bg-card"
                : "bg-muted/30 cursor-default opacity-70"
            )}
          >
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={cn(
                  "text-xs font-semibold px-2 py-0.5 rounded-full",
                  TYPE_COLORS[session.session_type]
                )}
              >
                {TYPE_LABELS[session.session_type]}
              </span>
              {session.scenario_name && (
                <span className="text-xs text-muted-foreground">{session.scenario_name}</span>
              )}
              <span className="text-xs text-muted-foreground me-auto">
                {relativeDate(session.started_at)}
              </span>
              {!hasFeedback && (
                <span className="text-xs text-destructive/70 font-medium">לא הסתיים</span>
              )}
            </div>
            {preview && (
              <p className="text-xs text-muted-foreground line-clamp-1">{preview}</p>
            )}
          </button>
        );
      })}

      <Sheet open={!!openSession} onOpenChange={(o: boolean) => { if (!o) { stopTTS(); setOpenId(null); } }}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[80vh] overflow-y-auto">
          {openSession && (
            <>
              <SheetHeader className="text-start pb-4 border-b border-border">
                <SheetTitle className="font-black text-xl">
                  {openSession.scenario_name ?? TYPE_LABELS[openSession.session_type]}
                </SheetTitle>
                <div className="flex gap-4 text-sm text-muted-foreground">
                  <span>{formatDuration(openSession.started_at, openSession.ended_at)}</span>
                  <span>
                    {openSession.messages
                      ? `${Math.floor(openSession.messages.length / 2)} החלפות`
                      : ""}
                  </span>
                  <span>{TYPE_LABELS[openSession.session_type]}</span>
                </div>
              </SheetHeader>

              <div className="pt-4 space-y-4">
                <pre className="text-sm leading-relaxed whitespace-pre-wrap font-sans">
                  {openSession.feedback_text}
                </pre>

                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 rounded-xl"
                  onClick={() =>
                    isPlaying
                      ? stopTTS()
                      : playTTS(openSession.feedback_text!, "he")
                  }
                >
                  <Volume2 className={cn("size-4", isPlaying && "animate-pulse")} />
                  {isPlaying ? "עצור" : "השמע פידבק בעברית"}
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
