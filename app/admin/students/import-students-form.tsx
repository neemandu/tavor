"use client";

import { useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Upload, Loader2, FileDown } from "lucide-react";
import { useRouter } from "next/navigation";

interface Course {
  id: string;
  name: string;
}

export function ImportStudentsForm({ courses }: { courses: Course[] }) {
  const [courseId, setCourseId] = useState("");
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    const formData = new FormData();
    formData.append("file", file);
    if (courseId) formData.append("courseId", courseId);

    try {
      const res = await fetch("/api/admin/users/import", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "שגיאה בייבוא");

      if (data.imported > 0) {
        toast.success(`יובאו ${data.imported} חניכים בהצלחה`);
      }
      if (data.skipped?.length > 0) {
        toast.error(
          `${data.skipped.length} שורות דולגו: ${data.skipped
            .map((s: { row: number; reason: string }) => `שורה ${s.row} - ${s.reason}`)
            .join(", ")}`
        );
      }
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "שגיאה בייבוא");
    } finally {
      setLoading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Upload className="size-4" />
          ייבוא חניכים מאקסל
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap items-end gap-4">
        <div className="space-y-1.5 min-w-48">
          <Label>קורס לשיוך (אופציונלי)</Label>
          <Select value={courseId} onValueChange={(v) => setCourseId(v ?? "")}>
            <SelectTrigger>
              <SelectValue placeholder="ללא קורס">
                {courseId ? courses.find((c) => c.id === courseId)?.name : undefined}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {courses.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={handleFile}
        />
        <Button
          variant="outline"
          onClick={() => fileRef.current?.click()}
          disabled={loading}
          className="gap-1.5"
        >
          {loading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
          בחר קובץ אקסל
        </Button>

        <a
          href="/api/admin/users/import/template"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground hover:underline"
        >
          <FileDown className="size-4" />
          הורד קובץ לדוגמה
        </a>

        <p className="w-full text-xs text-muted-foreground">
          עמודות נדרשות: <strong>שם מלא</strong>, <strong>אימייל</strong>, <strong>סיסמה</strong>
        </p>
      </CardContent>
    </Card>
  );
}
