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
import { ChevronLeft, ArrowRight } from "lucide-react";

export default async function ScenariosPage() {
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
        <div className="pt-2 flex items-center gap-2">
          <Link
            href="/ai-practice"
            aria-label="חזרה"
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowRight className="size-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-black">תרחישים מובנים</h1>
            <p className="text-sm text-muted-foreground">בחר תרחיש לתרגול</p>
          </div>
        </div>

        {scenarios.length > 0 && (
          <div className="space-y-3">
            {scenarios.map((scenario) => (
              <Link key={scenario.id} href={`/ai-practice/${scenario.id}`} className="block">
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
    </StudentShell>
  );
}
