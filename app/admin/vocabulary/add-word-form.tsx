"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CATEGORY_LABELS, type VocabularyCategory } from "@/types";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";

const INFLECTION_KEYS: { key: string; label: string }[] = [
  { key: "ריבוי", label: "ריבוי" },
  { key: "זכר", label: "זכר" },
  { key: "נקבה", label: "נקבה" },
  { key: "עבר", label: "עבר" },
  { key: "עתיד", label: "עתיד" },
  { key: "ציווי", label: "ציווי" },
];

export function AddWordForm() {
  const [arabic, setArabic] = useState("");
  const [transliteration, setTransliteration] = useState("");
  const [hebrew, setHebrew] = useState("");
  const [category, setCategory] = useState<VocabularyCategory | "">("");
  const [inflections, setInflections] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  function updateInflection(key: string, value: string) {
    setInflections((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!arabic || !hebrew) return;
    setLoading(true);
    try {
      const supabase = createClient();
      const filteredInflections = Object.fromEntries(
        Object.entries(inflections).filter(([, v]) => v.trim() !== "")
      );
      const { error } = await supabase.from("vocabulary").insert({
        arabic_text: arabic,
        transliteration: transliteration || null,
        hebrew_translation: hebrew,
        category: category || null,
        inflections: Object.keys(filteredInflections).length > 0 ? filteredInflections : null,
      });
      if (error) throw error;
      toast.success("מילה נוספה בהצלחה");
      setArabic("");
      setTransliteration("");
      setHebrew("");
      setCategory("");
      setInflections({});
      router.refresh();
    } catch {
      toast.error("שגיאה בהוספת מילה");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">ערבית *</Label>
          <Input
            value={arabic}
            onChange={(e) => setArabic(e.target.value)}
            dir="rtl"
            lang="ar"
            placeholder="كلمة"
            required
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">תעתיק</Label>
          <Input
            value={transliteration}
            onChange={(e) => setTransliteration(e.target.value)}
            dir="ltr"
            placeholder="kalima"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">עברית *</Label>
          <Input
            value={hebrew}
            onChange={(e) => setHebrew(e.target.value)}
            placeholder="מילה"
            required
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">קטגוריה</Label>
          <Select value={category} onValueChange={(v) => setCategory((v ?? "") as VocabularyCategory)}>
            <SelectTrigger>
              <SelectValue placeholder="בחר..." />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <details className="group">
        <summary className="text-xs font-medium text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors list-none flex items-center gap-1">
          <span className="group-open:rotate-90 transition-transform inline-block">▶</span>
          נטיות (אופציונלי)
        </summary>
        <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
          {INFLECTION_KEYS.map(({ key, label }) => (
            <div key={key} className="space-y-1">
              <Label className="text-xs">{label}</Label>
              <Input
                value={inflections[key] ?? ""}
                onChange={(e) => updateInflection(key, e.target.value)}
                placeholder=""
                dir="rtl"
                lang="ar"
                className="text-sm"
              />
            </div>
          ))}
        </div>
      </details>

      <div>
        <Button type="submit" size="sm" disabled={loading} className="gap-1.5">
          <Plus className="size-4" />
          {loading ? "מוסיף..." : "הוסף מילה"}
        </Button>
      </div>
    </form>
  );
}
