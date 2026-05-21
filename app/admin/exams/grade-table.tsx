"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Save, Download } from "lucide-react";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";

interface Student { id: string; name: string }
interface Submission { exam_id: string; user_id: string; submitted_at: string; users: { name: string } | null }
interface Grade { exam_id: string; user_id: string; score: number }

interface Props {
  examId: string;
  students: Student[];
  submissions: Submission[];
  grades: Grade[];
}

export function GradeTable({ examId, students, submissions, grades }: Props) {
  const submittedIds = new Set(submissions.map((s) => s.user_id));
  const gradeMap = Object.fromEntries(grades.map((g) => [g.user_id, g.score]));
  const [localGrades, setLocalGrades] = useState<Record<string, string>>(
    Object.fromEntries(Object.entries(gradeMap).map(([k, v]) => [k, String(v)]))
  );
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  async function saveGrades() {
    setSaving(true);
    try {
      const supabase = createClient();
      const upserts = Object.entries(localGrades)
        .filter(([, v]) => v !== "" && !isNaN(Number(v)))
        .map(([userId, score]) => ({
          exam_id: examId,
          user_id: userId,
          score: Number(score),
        }));

      if (upserts.length === 0) return;

      const { error } = await supabase.from("grades").upsert(upserts, {
        onConflict: "exam_id,user_id",
      });
      if (error) throw error;

      // Award 20 pts for newly achieved high scores (≥ 80)
      const highScoreUpserts = upserts.filter((u) => {
        const prev = gradeMap[u.user_id];
        return u.score >= 80 && (prev === undefined || prev < 80);
      });
      for (const u of highScoreUpserts) {
        fetch("/api/admin/points/award", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: u.user_id,
            points: 20,
            reason: "exam_score",
            metadata: { exam_id: examId, score: u.score },
          }),
        }).catch(() => {});
      }

      toast.success("הציונים נשמרו");
      router.refresh();
    } catch {
      toast.error("שגיאה בשמירת ציונים");
    } finally {
      setSaving(false);
    }
  }

  function exportExcel() {
    const rows = students.map((s) => ({
      שם: s.name,
      "הגיש?": submittedIds.has(s.id) ? "כן" : "לא",
      ציון: localGrades[s.id] ?? "",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "ציונים");
    XLSX.writeFile(wb, `grades_${examId}.xlsx`);
  }

  if (students.length === 0) {
    return <p className="text-sm text-muted-foreground">אין חניכים</p>;
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="p-2.5 text-start font-medium">חניך</th>
              <th className="p-2.5 text-start font-medium">סטטוס</th>
              <th className="p-2.5 text-start font-medium">ציון (0–100)</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s) => (
              <tr key={s.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                <td className="p-2.5 font-medium">{s.name}</td>
                <td className="p-2.5">
                  {submittedIds.has(s.id) ? (
                    <Badge variant="secondary" className="text-xs">הוגש</Badge>
                  ) : (
                    <span className="text-muted-foreground text-xs">טרם הוגש</span>
                  )}
                </td>
                <td className="p-2.5">
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={localGrades[s.id] ?? ""}
                    onChange={(e) =>
                      setLocalGrades((prev) => ({ ...prev, [s.id]: e.target.value }))
                    }
                    className="w-20 h-7 text-sm"
                    dir="ltr"
                    placeholder="—"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex gap-2">
        <Button size="sm" onClick={saveGrades} disabled={saving} className="gap-1.5">
          <Save className="size-4" />
          {saving ? "שומר..." : "שמור ציונים"}
        </Button>
        <Button size="sm" variant="outline" onClick={exportExcel} className="gap-1.5">
          <Download className="size-4" />
          Excel
        </Button>
      </div>
    </div>
  );
}
