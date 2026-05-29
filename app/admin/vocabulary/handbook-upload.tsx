"use client";

import { useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { BookOpen, Upload, Loader2, FileText, ExternalLink } from "lucide-react";
import { useRouter } from "next/navigation";

interface Course { id: string; name: string }
interface Handbook { courseId: string; fileName: string; signedUrl: string }

export function HandbookUpload({ courses, handbooks }: { courses: Course[]; handbooks: Handbook[] }) {
  const [courseId, setCourseId] = useState("");
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const currentHandbook = handbooks.find((h) => h.courseId === courseId) ?? null;

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !courseId) {
      toast.error("בחר קורס לפני העלאת החוברת");
      return;
    }

    setLoading(true);
    try {
      const urlRes = await fetch(
        `/api/admin/handbooks?courseId=${encodeURIComponent(courseId)}&fileName=${encodeURIComponent(file.name)}`
      );
      const urlData = await urlRes.json();
      if (!urlRes.ok) throw new Error(urlData.error ?? urlRes.statusText);

      const uploadRes = await fetch(urlData.signedUrl, {
        method: "PUT",
        headers: { "Content-Type": "application/pdf" },
        body: file,
      });
      if (!uploadRes.ok) throw new Error(`העלאה נכשלה: ${uploadRes.status}`);

      const res = await fetch("/api/admin/handbooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId, filePath: urlData.filePath, fileName: file.name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? res.statusText);

      toast.success("החוברת הועלתה בהצלחה");
      router.refresh();
    } catch (err) {
      toast.error(`שגיאה: ${err instanceof Error ? err.message : String(err)}`);
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
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="space-y-1.5 min-w-[200px]">
            <Label>קורס</Label>
            <Select value={courseId} onValueChange={(v) => setCourseId(v ?? "")}>
              <SelectTrigger>
                <SelectValue placeholder="בחר קורס">
                  {courseId ? courses.find((c) => c.id === courseId)?.name : undefined}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {courses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={handleUpload} />
          <Button
            onClick={() => courseId ? fileRef.current?.click() : toast.error("בחר קורס תחילה")}
            disabled={loading}
            className="gap-1.5"
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
            {currentHandbook ? "החלף PDF" : "העלה PDF"}
          </Button>
        </div>

        {currentHandbook && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileText className="size-4 shrink-0" />
              <span className="truncate">{currentHandbook.fileName}</span>
              <a
                href={currentHandbook.signedUrl}
                target="_blank"
                rel="noreferrer"
                className="ms-auto shrink-0 flex items-center gap-1 text-primary hover:underline"
              >
                <ExternalLink className="size-3.5" />
                פתח
              </a>
            </div>
            <iframe
              src={currentHandbook.signedUrl}
              className="w-full rounded-md border"
              style={{ height: "60vh" }}
              title="חוברת לימוד"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
