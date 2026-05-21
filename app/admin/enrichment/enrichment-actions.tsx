"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface EnrichmentActionsProps {
  itemId: string;
  isActive: boolean;
}

export function EnrichmentActions({ itemId, isActive }: EnrichmentActionsProps) {
  const [loadingToggle, setLoadingToggle] = useState(false);
  const [loadingDelete, setLoadingDelete] = useState(false);
  const router = useRouter();

  async function handleToggle() {
    setLoadingToggle(true);
    try {
      const res = await fetch(`/api/admin/enrichment/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !isActive }),
      });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      toast.error("שגיאה בעדכון הפריט");
    } finally {
      setLoadingToggle(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm("למחוק?")) return;
    setLoadingDelete(true);
    try {
      const res = await fetch(`/api/admin/enrichment/${itemId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      toast.success("הפריט נמחק");
      router.refresh();
    } catch {
      toast.error("שגיאה במחיקת הפריט");
    } finally {
      setLoadingDelete(false);
    }
  }

  return (
    <div className="flex items-center gap-2 shrink-0">
      <Button
        variant="ghost"
        size="sm"
        onClick={handleToggle}
        disabled={loadingToggle}
      >
        {isActive ? "השבת" : "הפעל"}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="text-destructive hover:text-destructive"
        onClick={handleDelete}
        disabled={loadingDelete}
      >
        מחק
      </Button>
    </div>
  );
}
