"use client";

import { useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Upload, Loader2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";

interface Course { id: string; name: string }

export function UploadExamForm({ courses }: { courses: Course[] }) {
  const [name, setName] = useState("");
  const [courseId, setCourseId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) { toast.error("בחר קובץ PDF"); return; }

    setLoading(true);
    try {
      const supabase = createClient();
      const path = `${courseId || "general"}/${Date.now()}_${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from("exams")
        .upload(path, file);
      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase.from("exams").insert({
        name,
        course_id: courseId || null,
        file_path: path,
        due_date: dueDate || null,
      });
      if (dbError) throw dbError;

      toast.success("המבחן הועלה בהצלחה");
      setName("");
      setCourseId("");
      setDueDate("");
      if (fileRef.current) fileRef.current.value = "";
      router.refresh();
    } catch {
      toast.error("שגיאה בהעלאת המבחן");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Plus className="size-4" />
          העלאת מבחן חדש
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>שם המבחן *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="מבחן סוף קורס" required />
          </div>
          <div className="space-y-1.5">
            <Label>קורס</Label>
            <Select value={courseId} onValueChange={(v) => setCourseId(v ?? "")}>
              <SelectTrigger><SelectValue placeholder="כל הקורסים" /></SelectTrigger>
              <SelectContent>
                {courses.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>תאריך הגשה</Label>
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} dir="ltr" />
          </div>
          <div className="space-y-1.5">
            <Label>קובץ PDF *</Label>
            <input ref={fileRef} type="file" accept=".pdf" className="block w-full text-sm" required />
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={loading} className="gap-1.5">
              {loading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
              {loading ? "מעלה..." : "העלה מבחן"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
