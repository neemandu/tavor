"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { CheckCircle } from "lucide-react";
import { useRouter } from "next/navigation";

interface Props {
  examId: string;
  examName: string;
  studentId: string;
}

export function SubmitExamButton({ examId, examName }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit() {
    setLoading(true);
    try {
      const res = await fetch("/api/exams/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ examId }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "שגיאה בהגשה");
      }

      setOpen(false);
      toast.success("המבחן הוגש בהצלחה!");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "שגיאה");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" className="gap-1.5" />}>
        <CheckCircle className="size-4" />
        סיימתי
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>אישור הגשה</DialogTitle>
          <DialogDescription>
            אתה עומד לדווח שסיימת את המבחן: <strong>{examName}</strong>.
            <br />
            המדריך יקבל הודעה אוטומטית. לא ניתן לבטל פעולה זו.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            ביטול
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "שולח..." : "אשר הגשה"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
