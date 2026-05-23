export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { StudentShell } from "@/components/student-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  DIFFICULTY_LABELS,
  SCENARIO_CATEGORY_LABELS,
  type ScenarioDifficulty,
  type ScenarioCategory,
} from "@/types";
import { ChevronLeft, Zap, PenLine, MessageCircle, List } from "lucide-react";

type ModeCard = {
  href: string | null;
  icon: React.ElementType;
  title: string;
  description: string;
  accentColor: string;
};

const MODES: ModeCard[] = [
  {
    href: null,
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

  const { data: scenariosData } = await supabase
    .from("scenarios")
    .select("id, name, student_description, difficulty, category")
    .eq("is_active", true)
    .order("created_at", { ascending: false });
  const scenarios = scenariosData ?? [];

  const difficultyColors: Record<ScenarioDifficulty, string> = {
    easy: "bg-green-100 text-green-700",
    medium: "bg-yellow-100 text-yellow-700",
    hard: "bg-red-100 text-red-700",
  };

  return (
    <StudentShell>
      <div className="p-4 max-w-lg mx-auto space-y-5">
        <div className="pt-2">
          <h1 className="text-3xl font-black">תרגול AI</h1>
          <p className="text-sm text-muted-foreground">בחר מצב תרגול</p>
        </div>

        {/* Mode cards */}
        <div className="space-y-3">
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
                <Link key={mode.title} href={mode.href}>
                  {card}
                </Link>
              );
            }
            return <div key={mode.title}>{card}</div>;
          })}
        </div>

        {/* Scenarios list */}
        <div>
          <p className="text-sm font-semibold text-muted-foreground mb-3">
            תרחישים מובנים
          </p>

          {scenarios.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground text-center">
              <Zap className="size-12 mb-3 opacity-30" />
              <p>עדיין אין תרחישים פעילים</p>
              <p className="text-sm">פנה למדריך שלך</p>
            </div>
          ) : (
            <div className="space-y-3">
              {scenarios.map((scenario) => (
                <Link key={scenario.id} href={`/ai-practice/${scenario.id}`}>
                  <Card className="rounded-2xl hover:bg-muted/50 transition-colors cursor-pointer shadow-[var(--shadow-card)]">
                    <CardContent className="p-4 flex items-start gap-3">
                      <div className="flex-1 space-y-1.5">
                        <p className="font-bold">{scenario.name}</p>
                        {scenario.student_description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {scenario.student_description}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {scenario.difficulty && (
                            <span
                              className={`text-xs font-medium px-2 py-0.5 rounded-full ${difficultyColors[scenario.difficulty as ScenarioDifficulty]}`}
                            >
                              {DIFFICULTY_LABELS[scenario.difficulty as ScenarioDifficulty]}
                            </span>
                          )}
                          {scenario.category && (
                            <Badge variant="outline" className="text-xs rounded-full">
                              {SCENARIO_CATEGORY_LABELS[scenario.category as ScenarioCategory]}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <ChevronLeft className="size-5 text-muted-foreground shrink-0 mt-1" />
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </StudentShell>
  );
}
