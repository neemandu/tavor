"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function CourseToggle({ courseId, isActive }: { courseId: string; isActive: boolean }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function toggle() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/courses/${courseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !isActive }),
      });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      toast.error("שגיאה בעדכון הקורס");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button variant="ghost" size="sm" onClick={toggle} disabled={loading}>
      {isActive ? "השבת" : "הפעל"}
    </Button>
  );
}
