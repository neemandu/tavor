"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  examId: string;
  filePath: string;
  examName: string;
}

export function DownloadExamButton({ filePath, examName }: Props) {
  const [loading, setLoading] = useState(false);

  async function handleDownload() {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.storage
        .from("exams")
        .createSignedUrl(filePath, 300);

      if (error || !data?.signedUrl) throw new Error("לא ניתן לטעון את המבחן");

      const a = document.createElement("a");
      a.href = data.signedUrl;
      a.download = `${examName}.pdf`;
      a.target = "_blank";
      a.click();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "שגיאה בהורדה");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleDownload}
      disabled={loading}
      className="gap-1.5"
    >
      {loading ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <Download className="size-4" />
      )}
      הורדה
    </Button>
  );
}
