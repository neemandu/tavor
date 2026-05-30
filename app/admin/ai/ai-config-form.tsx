"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RotateCcw } from "lucide-react";

type Values = {
  ai_persona: string;
  ai_free_practice: string;
  ai_free_conversation: string;
  ai_feedback: string;
};

const FIELDS: { key: keyof Values; label: string; help: string; rows: number }[] = [
  {
    key: "ai_persona",
    label: "אישיות הסוכן (פרסונה)",
    help: "מי הסוכן, אופי, ניב והתנהגות כללית — חל על כל תרגול קולי וכתוב.",
    rows: 16,
  },
  {
    key: "ai_free_practice",
    label: "תרגול חופשי",
    help: "הנחיות למצב 'תאר סיטואציה'. הסיטואציה של החניך מוזרקת אוטומטית.",
    rows: 4,
  },
  {
    key: "ai_free_conversation",
    label: "שיחה חופשית",
    help: "הנחיות לשיחה החופשית (30 דק').",
    rows: 4,
  },
  {
    key: "ai_feedback",
    label: "פידבק",
    help: "כיצד ה-AI נותן משוב בסוף שיחה. תמלול השיחה מוזרק אוטומטית.",
    rows: 12,
  },
];

export function AiConfigForm({
  initial,
  defaults,
}: {
  initial: Values;
  defaults: Values;
}) {
  const [values, setValues] = useState<Values>(initial);
  const [saving, setSaving] = useState(false);

  function setField(key: keyof Values, value: string) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/ai-config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ values }),
      });
      if (res.ok) {
        toast.success("ההגדרות נשמרו");
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? "שגיאה בשמירה");
      }
    } catch {
      toast.error("שגיאה בשמירה");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {FIELDS.map(({ key, label, help, rows }) => (
        <div key={key} className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label>{label}</Label>
            <button
              type="button"
              onClick={() => setField(key, defaults[key])}
              disabled={values[key] === defaults[key]}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-40"
            >
              <RotateCcw className="size-3" />
              איפוס לברירת מחדל
            </button>
          </div>
          <p className="text-xs text-muted-foreground">{help}</p>
          <Textarea
            value={values[key]}
            onChange={(e) => setField(key, e.target.value)}
            rows={rows}
            dir="auto"
            className="font-mono text-xs"
          />
        </div>
      ))}

      <div className="sticky bottom-0 bg-background py-3">
        <Button onClick={handleSave} disabled={saving} size="lg">
          {saving ? "שומר…" : "שמור הגדרות"}
        </Button>
      </div>
    </div>
  );
}
