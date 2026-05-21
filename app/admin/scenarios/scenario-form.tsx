"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DIFFICULTY_LABELS, SCENARIO_CATEGORY_LABELS } from "@/types";
import { toast } from "sonner";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { useRouter } from "next/navigation";

export function ScenarioForm({ userId }: { userId: string }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [role, setRole] = useState("");
  const [aiInstructions, setAiInstructions] = useState("");
  const [voiceInstructions, setVoiceInstructions] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [category, setCategory] = useState("");
  const [hints, setHints] = useState<string[]>([""]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
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
      const supabase = createClient();
      const filteredHints = hints.filter((h) => h.trim());
      const { error } = await supabase.from("scenarios").insert({
        name,
        student_description: description || null,
        student_role: role || null,
        ai_instructions: aiInstructions || null,
        voice_instructions: voiceInstructions || null,
        hints: filteredHints.length > 0 ? filteredHints : null,
        difficulty: difficulty || null,
        category: category || null,
        created_by: userId,
      });
      if (error) throw error;
      toast.success("תרחיש נוצר בהצלחה");
      setName(""); setDescription(""); setRole(""); setAiInstructions("");
      setVoiceInstructions(""); setDifficulty(""); setCategory(""); setHints([""]);
      setOpen(false);
      router.refresh();
    } catch {
      toast.error("שגיאה ביצירת תרחיש");
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} className="gap-1.5">
        <Plus className="size-4" />
        תרחיש חדש
      </Button>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">תרחיש חדש</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>שם התרחיש *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="חיפוש ברכב במחסום" required />
            </div>
            <div className="space-y-1.5">
              <Label>תפקיד החניך</Label>
              <Input value={role} onChange={(e) => setRole(e.target.value)} placeholder="חייל בנקודת ביקורת" />
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
              placeholder={`לדוגמה:\n- דבר בקצב איטי וברור\n- השתמש בניב פלסטיני\n- אם החניך לא מבין, חזור על המשפט באיטיות ואל תעבור לעברית\n- הראה חוסר סבלנות מתון בהתאם לדמות`}
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
                  <button type="button" onClick={() => removeHint(i)} className="text-muted-foreground hover:text-destructive">
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
              {loading ? "שומר..." : "צור תרחיש"}
            </Button>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              ביטול
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
