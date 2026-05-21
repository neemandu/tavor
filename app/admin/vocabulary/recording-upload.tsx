"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Mic, Loader2, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function RecordingUpload({ wordId, hasRecording }: { wordId: string; hasRecording: boolean }) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(hasRecording);
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["mp3", "wav", "ogg", "m4a", "aac"].includes(ext ?? "")) {
      toast.error("קובץ שמע בלבד (mp3, wav, ogg)");
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const path = `${wordId}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("vocabulary-recordings")
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase
        .from("vocabulary")
        .update({ recording_path: path })
        .eq("id", wordId);

      if (dbError) throw dbError;

      setDone(true);
      toast.success("הקלטה הועלתה");
      router.refresh();
    } catch {
      toast.error("שגיאה בהעלאת הקלטה");
    } finally {
      setLoading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <>
      <input ref={fileRef} type="file" accept="audio/*" className="hidden" onChange={handleFile} />
      <Button
        variant="ghost"
        size="icon"
        className="size-7"
        title="העלה הקלטה"
        onClick={() => fileRef.current?.click()}
        disabled={loading}
      >
        {loading ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : done ? (
          <CheckCircle className="size-3.5 text-green-600" />
        ) : (
          <Mic className="size-3.5 text-muted-foreground" />
        )}
      </Button>
    </>
  );
}
