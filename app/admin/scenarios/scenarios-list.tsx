"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DIFFICULTY_LABELS,
  SCENARIO_CATEGORY_LABELS,
  type Scenario,
  type ScenarioDifficulty,
  type ScenarioCategory,
} from "@/types";
import { Pencil, CheckCircle2, XCircle } from "lucide-react";
import { ScenarioToggle } from "./scenario-toggle";
import { ScenarioEditForm } from "./scenario-edit-form";

interface Props {
  scenarios: Scenario[];
}

export function ScenariosList({ scenarios }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);

  if (scenarios.length === 0) {
    return <p className="text-sm text-muted-foreground">עדיין לא נוצרו תרחישים</p>;
  }

  return (
    <div className="space-y-3">
      {scenarios.map((scenario) => (
        <div key={scenario.id} className="space-y-2">
          <Card className={scenario.is_active ? "" : "opacity-60"}>
            <CardContent className="p-4 flex items-start gap-3">
              <div className="flex-1 space-y-1.5 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-base leading-tight">{scenario.name}</p>
                  {scenario.is_active ? (
                    <span className="inline-flex items-center gap-1 text-xs text-green-700 font-medium">
                      <CheckCircle2 className="size-3.5" />
                      פעיל
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <XCircle className="size-3.5" />
                      לא פעיל
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {scenario.category && (
                    <Badge variant="secondary" className="text-xs">
                      {SCENARIO_CATEGORY_LABELS[scenario.category as ScenarioCategory]}
                    </Badge>
                  )}
                  {scenario.difficulty && (
                    <Badge variant="outline" className="text-xs">
                      {DIFFICULTY_LABELS[scenario.difficulty as ScenarioDifficulty]}
                    </Badge>
                  )}
                  {scenario.hints && (
                    <span className="text-xs text-muted-foreground">
                      {(scenario.hints as string[]).length} הכוונות
                    </span>
                  )}
                </div>
                {scenario.student_description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {scenario.student_description}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5 h-8"
                  onClick={() => setEditingId(editingId === scenario.id ? null : scenario.id)}
                  aria-label="ערוך תרחיש"
                >
                  <Pencil className="size-3.5" />
                  ערוך
                </Button>
                <ScenarioToggle
                  scenarioId={scenario.id}
                  isActive={scenario.is_active}
                />
              </div>
            </CardContent>
          </Card>
          {editingId === scenario.id && (
            <ScenarioEditForm
              scenario={scenario}
              onClose={() => setEditingId(null)}
            />
          )}
        </div>
      ))}
    </div>
  );
}
