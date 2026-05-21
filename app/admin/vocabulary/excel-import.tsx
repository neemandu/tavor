"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Upload, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

export function ExcelImportButton() {
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/vocabulary/import", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "שגיאה בייבוא");

      toast.success(`יובאו ${data.imported} מילים בהצלחה`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "שגיאה בייבוא");
    } finally {
      setLoading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={handleFile}
      />
      <Button
        variant="outline"
        size="sm"
        onClick={() => fileRef.current?.click()}
        disabled={loading}
        className="gap-1.5"
      >
        {loading ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Upload className="size-4" />
        )}
        ייבוא Excel
      </Button>
    </>
  );
}
