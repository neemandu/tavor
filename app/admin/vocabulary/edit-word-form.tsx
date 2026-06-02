"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CATEGORY_LABELS, VOCAB_CATEGORIES, type VocabularyCategory } from "@/types";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface WordProps {
  id: string;
  hebrew_phonetic: string;
  transliteration: string | null;
  hebrew_translation: string;
  category: string | null;
  chapter: number | null;
  inflections: Record<string, string> | null;
}

interface Props {
  word: WordProps;
  onClose: () => void;
}

const INFLECTION_KEYS: { key: string; label: string }[] = [
  { key: "ריבוי", label: "ריבוי" },
  { key: "זכר", label: "זכר" },
  { key: "נקבה", label: "נקבה" },
  { key: "עבר", label: "עבר" },
  { key: "עתיד", label: "עתיד" },
  { key: "ציווי", label: "ציווי" },
];

export function EditWordForm({ word, onClose }: Props) {
  const [phonetic, setPhonetic] = useState(word.hebrew_phonetic);
  const [transliteration, setTransliteration] = useState(word.transliteration ?? "");
  const [hebrew, setHebrew] = useState(word.hebrew_translation);
  const [category, setCategory] = useState<VocabularyCategory | "">(
    (word.category as VocabularyCategory) ?? ""
  );
  const [chapter, setChapter] = useState(word.chapter != null ? String(word.chapter) : "");
  const [inflections, setInflections] = useState<Record<string, string>>(
    word.inflections ?? {}
  );
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  function updateInflection(key: string, value: string) {
    setInflections((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!phonetic || !hebrew) return;
    setLoading(true);
    try {
      const filteredInflections = Object.fromEntries(
        Object.entries(inflections).filter(([, v]) => v.trim() !== "")
      );

      const res = await fetch(`/api/admin/vocabulary/${word.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hebrew_phonetic: phonetic,
          transliteration: transliteration || null,
          hebrew_translation: hebrew,
          category: category || null,
          chapter: chapter && /^\d+$/.test(chapter) ? parseInt(chapter, 10) : null,
          inflections: Object.keys(filteredInflections).length > 0 ? filteredInflections : null,
        }),
      });
      if (!res.ok) throw new Error("שגיאה בעדכון");
      toast.success("מילה עודכנה בהצלחה");
      router.refresh();
      onClose();
    } catch {
      toast.error("שגיאה בעדכון המילה");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="p-3 bg-muted/30 rounded-md space-y-3 border">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">מילה *</Label>
          <Input
            value={phonetic}
            onChange={(e) => setPhonetic(e.target.value)}
            dir="rtl"
            placeholder="זַ׳אבֵט"
            required
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">תעתיק</Label>
          <Input
            value={transliteration}
            onChange={(e) => setTransliteration(e.target.value)}
            dir="ltr"
            placeholder="dabet"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">עברית *</Label>
          <Input
            value={hebrew}
            onChange={(e) => setHebrew(e.target.value)}
            placeholder="קצין"
            required
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">קטגוריה</Label>
          <Select value={category} onValueChange={(v) => setCategory((v ?? "") as VocabularyCategory)}>
            <SelectTrigger>
              <SelectValue placeholder="בחר...">
                {category ? CATEGORY_LABELS[category as VocabularyCategory] : undefined}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {VOCAB_CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">פרק</Label>
          <Input
            value={chapter}
            onChange={(e) => setChapter(e.target.value)}
            dir="ltr"
            inputMode="numeric"
            placeholder="1"
          />
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

      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={loading}>
          {loading ? "שומר..." : "שמור"}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={onClose}>
          ביטול
        </Button>
      </div>
    </form>
  );
}
