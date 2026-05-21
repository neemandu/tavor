"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CATEGORY_LABELS, type VocabularyCategory } from "@/types";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { EditWordForm } from "./edit-word-form";
import { RecordingUpload } from "./recording-upload";

interface Word {
  id: string;
  arabic_text: string;
  transliteration: string | null;
  hebrew_translation: string;
  category: string | null;
  recording_path: string | null;
  inflections: Record<string, string> | null;
}

interface Props {
  words: Word[];
}

export function VocabularyTable({ words }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const router = useRouter();

  async function handleDelete(word: Word) {
    if (!window.confirm("למחוק את המילה?")) return;
    setDeletingId(word.id);
    try {
      const res = await fetch(`/api/admin/vocabulary/${word.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("שגיאה במחיקה");
      toast.success("מילה נמחקה");
      router.refresh();
    } catch {
      toast.error("שגיאה במחיקת המילה");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="border rounded-md overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/40">
            <th className="p-2.5 text-start font-medium">ערבית</th>
            <th className="p-2.5 text-start font-medium">תעתיק</th>
            <th className="p-2.5 text-start font-medium">עברית</th>
            <th className="p-2.5 text-start font-medium">קטגוריה</th>
            <th className="p-2.5 text-start font-medium">הקלטה</th>
            <th className="p-2.5 text-start font-medium">פעולות</th>
          </tr>
        </thead>
        <tbody>
          {words.map((w) => (
            <>
              <tr key={w.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                <td
                  className="p-2.5 font-medium text-base"
                  dir="rtl"
                  lang="ar"
                  style={{ fontFamily: "var(--font-noto-arabic)" }}
                >
                  {w.arabic_text}
                </td>
                <td className="p-2.5 text-muted-foreground italic text-xs" dir="ltr">
                  {w.transliteration ?? "—"}
                </td>
                <td className="p-2.5">{w.hebrew_translation}</td>
                <td className="p-2.5">
                  {w.category ? (
                    <Badge variant="outline" className="text-xs">
                      {CATEGORY_LABELS[w.category as VocabularyCategory]}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="p-2.5">
                  <RecordingUpload wordId={w.id} hasRecording={!!w.recording_path} />
                </td>
                <td className="p-2.5">
                  <div className="flex items-center gap-0.5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-7 text-muted-foreground hover:text-foreground"
                      onClick={() => setEditingId(editingId === w.id ? null : w.id)}
                      aria-label="ערוך מילה"
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-7 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDelete(w)}
                      disabled={deletingId === w.id}
                      aria-label="מחק מילה"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </td>
              </tr>
              {editingId === w.id && (
                <tr key={`${w.id}-edit`} className="border-b last:border-0 bg-muted/20">
                  <td colSpan={6} className="p-3">
                    <EditWordForm
                      word={w}
                      onClose={() => setEditingId(null)}
                    />
                  </td>
                </tr>
              )}
            </>
          ))}
        </tbody>
      </table>
    </div>
  );
}
