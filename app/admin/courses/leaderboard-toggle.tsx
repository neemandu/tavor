"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function LeaderboardToggle({
  courseId,
  showLeaderboard,
}: {
  courseId: string;
  showLeaderboard: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function toggle() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/courses/${courseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ show_leaderboard: !showLeaderboard }),
      });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      toast.error("שגיאה בעדכון לוח השיאים");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button variant="ghost" size="sm" onClick={toggle} disabled={loading}>
      {showLeaderboard ? "הסתר לוח" : "הצג לוח"}
    </Button>
  );
}
