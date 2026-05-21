"use client";

import { useState } from "react";
import { Volume2, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function AudioPlayer({ filePath }: { filePath: string }) {
  const [loading, setLoading] = useState(false);

  async function play() {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data } = await supabase.storage
        .from("vocabulary-recordings")
        .createSignedUrl(filePath, 300);

      if (data?.signedUrl) {
        const audio = new Audio(data.signedUrl);
        await audio.play();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={play}
      disabled={loading}
      className="shrink-0 p-2 rounded-full bg-primary/10 hover:bg-primary/20 text-primary transition-colors disabled:opacity-50"
      aria-label="השמע הקלטה"
    >
      {loading ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <Volume2 className="size-4" />
      )}
    </button>
  );
}
