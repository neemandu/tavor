"use client";

import { useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { BookOpen, Upload, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface Course { id: string; name: string }

export function HandbookUpload({ courses }: { courses: Course[] }) {
  const [courseId, setCourseId] = useState("");
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !courseId) {
      toast.error("בחר קורס לפני העלאת החוברת");
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const path = `${courseId}/${Date.now()}_${file.name}`;

      // Remove old handbook for this course
      const { data: existing } = await supabase
        .from("handbooks")
        .select("file_path")
        .eq("course_id", courseId)
        .maybeSingle();

      if (existing?.file_path) {
        await supabase.storage.from("handbooks").remove([existing.file_path]);
      }

      // Upload new file
      const { error: uploadError } = await supabase.storage
        .from("handbooks")
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Replace handbook record for this course
      await supabase.from("handbooks").delete().eq("course_id", courseId);
      const { error: dbError } = await supabase
        .from("handbooks")
        .insert({ course_id: courseId, file_path: path, file_name: file.name });

      if (dbError) throw dbError;

      toast.success("החוברת הועלתה בהצלחה");
      router.refresh();
    } catch {
      toast.error("שגיאה בהעלאת החוברת");
    } finally {
      setLoading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <BookOpen className="size-4" />
          העלאת חוברת לימוד
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-3 items-end">
        <div className="space-y-1.5 min-w-[200px]">
          <Label>קורס</Label>
          <Select value={courseId} onValueChange={(v) => setCourseId(v ?? "")}>
            <SelectTrigger>
              <SelectValue placeholder="בחר קורס" />
            </SelectTrigger>
            <SelectContent>
              {courses.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept=".pdf"
          className="hidden"
          onChange={handleUpload}
        />
        <Button
          onClick={() => courseId ? fileRef.current?.click() : toast.error("בחר קורס תחילה")}
          disabled={loading}
          className="gap-1.5"
        >
          {loading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
          העלה PDF
        </Button>
      </CardContent>
    </Card>
  );
}
