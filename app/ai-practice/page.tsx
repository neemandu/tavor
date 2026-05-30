export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { StudentShell } from "@/components/student-shell";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { ChevronLeft, PenLine, MessageCircle, List } from "lucide-react";
import { SessionHistory } from "./session-history";

type ModeCard = {
  href: string | null;
  icon: React.ElementType;
  title: string;
  description: string;
  accentColor: string;
};

const MODES: ModeCard[] = [
  {
    href: "/ai-practice/scenarios",
    icon: List,
    title: "תרחישים מובנים",
    description: "תרגול לפי תרחישים מוגדרים",
    accentColor: "border-s-primary",
  },
  {
    href: "/ai-practice/free",
    icon: PenLine,
    title: "תרגול חופשי",
    description: "תאר סיטואציה ותרגל אותה",
    accentColor: "border-s-teal-500",
  },
  {
    href: "/ai-practice/conversation",
    icon: MessageCircle,
    title: "שיחה חופשית",
    description: "שיחה פתוחה 30 דקות בערבית",
    accentColor: "border-s-indigo-500",
  },
];

export default async function AIPracticePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: sessionsData } = await supabase
    .from("ai_sessions")
    .select(
      `id, session_type, started_at, ended_at, feedback_text, messages, scenarios!left (name)`
    )
    .eq("user_id", user!.id)
    .order("started_at", { ascending: false })
    .limit(20);

  const sessions = (sessionsData ?? []).map((s: Record<string, unknown>) => ({
    id: s.id as string,
    session_type: s.session_type as "scenario" | "free_practice" | "free_conversation",
    started_at: s.started_at as string,
    ended_at: s.ended_at as string | null,
    feedback_text: s.feedback_text as string | null,
    messages: s.messages as { role: string; content: string }[] | null,
    scenario_name: (s.scenarios as { name?: string } | null)?.name ?? null,
  }));

  return (
    <StudentShell>
      <div className="p-4 max-w-lg mx-auto space-y-5">
        <div className="pt-2">
          <h1 className="text-3xl font-black">תרגול AI</h1>
          <p className="text-sm text-muted-foreground">בחר מצב תרגול</p>
        </div>

        {/* Mode cards — each is a direct child of the outer space-y-5 so gaps are uniform */}
        {MODES.map((mode) => {
          const Icon = mode.icon;
          const card = (
            <Card
              className={`rounded-2xl border-s-4 ${mode.accentColor} shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-elevated)] transition-shadow cursor-pointer`}
            >
              <CardContent className="p-5 flex items-center gap-4">
                <Icon className="size-10 text-muted-foreground shrink-0" strokeWidth={1.5} />
                <div className="flex-1 space-y-0.5">
                  <p className="text-lg font-bold leading-tight">{mode.title}</p>
                  <p className="text-sm text-muted-foreground">{mode.description}</p>
                </div>
                <ChevronLeft className="size-5 text-muted-foreground shrink-0" />
              </CardContent>
            </Card>
          );

          if (mode.href) {
            return (
              <Link key={mode.title} href={mode.href} className="block">
                {card}
              </Link>
            );
          }
          return <div key={mode.title}>{card}</div>;
        })}

        {/* Session history */}
        <SessionHistory sessions={sessions} />
      </div>
    </StudentShell>
  );
}
