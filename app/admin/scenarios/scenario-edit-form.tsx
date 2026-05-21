"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DIFFICULTY_LABELS,
  SCENARIO_CATEGORY_LABELS,
  type Scenario,
} from "@/types";
import { toast } from "sonner";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { useRouter } from "next/navigation";

interface Props {
  scenario: Scenario;
  onClose: () => void;
}

export function ScenarioEditForm({ scenario, onClose }: Props) {
  const [name, setName] = useState(scenario.name);
  const [description, setDescription] = useState(scenario.student_description ?? "");
  const [role, setRole] = useState(scenario.student_role ?? "");
  const [aiInstructions, setAiInstructions] = useState(scenario.ai_instructions ?? "");
  const [voiceInstructions, setVoiceInstructions] = useState(scenario.voice_instructions ?? "");
  const [difficulty, setDifficulty] = useState(scenario.difficulty ?? "");
  const [category, setCategory] = useState(scenario.category ?? "");
  const [hints, setHints] = useState<string[]>(scenario.hints ?? [""]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  function addHint() {
    setHints((prev) => [...prev, ""]);
  }

  function removeHint(i: number) {
    setHints((prev) => prev.filter((_, idx) => idx !== i));
  }

  function updateHint(i: number, value: string) {
    setHints((prev) => prev.map((h, idx) => (idx === i ? value : h)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      const filteredHints = hints.filter((h) => h.trim());
      const res = await fetch(`/api/admin/scenarios/${scenario.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          student_description: description || null,
          student_role: role || null,
          ai_instructions: aiInstructions || null,
          voice_instructions: voiceInstructions || null,
          hints: filteredHints.length > 0 ? filteredHints : null,
          difficulty: difficulty || null,
          category: category || null,
        }),
      });
      if (!res.ok) throw new Error("שגיאה בעדכון");
      toast.success("תרחיש עודכן בהצלחה");
      router.refresh();
      onClose();
    } catch {
      toast.error("שגיאה בעדכון התרחיש");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">עריכת תרחיש</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>שם התרחיש *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="חיפוש ברכב במחסום"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>תפקיד החניך</Label>
              <Input
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="חייל בנקודת ביקורת"
              />
            </div>
            <div className="space-y-1.5">
              <Label>רמת קושי</Label>
              <Select value={difficulty} onValueChange={(v) => setDifficulty(v ?? "")}>
                <SelectTrigger><SelectValue placeholder="בחר..." /></SelectTrigger>
                <SelectContent>
                  {Object.entries(DIFFICULTY_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>קטגוריה</Label>
              <Select value={category} onValueChange={(v) => setCategory(v ?? "")}>
                <SelectTrigger><SelectValue placeholder="בחר..." /></SelectTrigger>
                <SelectContent>
                  {Object.entries(SCENARIO_CATEGORY_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>תיאור לחניך (עברית)</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="3-4 שורות המתארות את הסיטואציה..."
              rows={3}
            />
          </div>

          <div className="space-y-1.5">
            <Label>הנחיות ל-AI (תפקיד ותוכן)</Label>
            <Textarea
              value={aiInstructions}
              onChange={(e) => setAiInstructions(e.target.value)}
              placeholder="תפקיד ה-AI, איך להתנהג, מה לאמר, רקע הדמות..."
              rows={4}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5">
              הנחיות לסוכן הקולי
              <span className="text-xs font-normal text-muted-foreground">(קצב, ניב, תגובה לקשיים)</span>
            </Label>
            <Textarea
              value={voiceInstructions}
              onChange={(e) => setVoiceInstructions(e.target.value)}
              placeholder={`לדוגמה:\n- דבר בקצב איטי וברור\n- השתמש בניב פלסטיני`}
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label>הכוונות (רשימה ממוספרת)</Label>
            {hints.map((hint, i) => (
              <div key={i} className="flex gap-2 items-center">
                <GripVertical className="size-4 text-muted-foreground shrink-0" />
                <span className="text-sm text-muted-foreground w-5">{i + 1}.</span>
                <Input
                  value={hint}
                  onChange={(e) => updateHint(i, e.target.value)}
                  placeholder={`הכוונה ${i + 1}`}
                  className="flex-1"
                />
                {hints.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeHint(i)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="size-4" />
                  </button>
                )}
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={addHint} className="gap-1.5">
              <Plus className="size-3.5" />
              הוסף הכוונה
            </Button>
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={loading}>
              {loading ? "שומר..." : "שמור שינויים"}
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              ביטול
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
