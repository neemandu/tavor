"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  extractPlaylistId,
  buildPlaylistEmbedUrl,
  DEFAULT_PLAYLIST_URL,
} from "@/lib/letters-video";

export function LettersVideoForm({ initialUrl }: { initialUrl: string }) {
  const [url, setUrl] = useState(initialUrl);
  const [saving, setSaving] = useState(false);

  const playlistId = useMemo(() => extractPlaylistId(url), [url]);
  const previewUrl = playlistId ? buildPlaylistEmbedUrl(playlistId) : null;
  const isInvalid = url.trim().length > 0 && !playlistId;

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/letters-video", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      if (res.ok) {
        toast.success("ההגדרות נשמרו");
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? "שגיאה בשמירה");
      }
    } catch {
      toast.error("שגיאה בשמירה");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label>קישור לפלייליסט יוטיוב</Label>
          <button
            type="button"
            onClick={() => setUrl(DEFAULT_PLAYLIST_URL)}
            disabled={url === DEFAULT_PLAYLIST_URL}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-40"
          >
            <RotateCcw className="size-3" />
            איפוס לברירת מחדל
          </button>
        </div>
        <p className="text-xs text-muted-foreground">
          הדבק קישור לפלייליסט יוטיוב (כתובת שמכילה <code>list=</code>). הסרטונים יוצגו
          בתוך האפליקציה בעמוד &quot;לימוד אותיות מסרטונים&quot;. שדה ריק יחזיר לברירת המחדל.
        </p>
        <Input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          dir="ltr"
          placeholder={DEFAULT_PLAYLIST_URL}
          className="font-mono text-xs"
        />
        {isInvalid && (
          <p className="text-xs text-destructive">
            הקישור אינו תקין — לא נמצא מזהה פלייליסט.
          </p>
        )}
      </div>

      {previewUrl && (
        <div className="space-y-1.5">
          <Label>תצוגה מקדימה</Label>
          <div className="aspect-video w-full max-w-xl rounded-xl overflow-hidden border bg-black">
            <iframe
              key={previewUrl}
              src={previewUrl}
              title="תצוגה מקדימה"
              className="h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
        </div>
      )}

      <div className="sticky bottom-0 bg-background py-3">
        <Button onClick={handleSave} disabled={saving || isInvalid} size="lg">
          {saving ? "שומר…" : "שמור הגדרות"}
        </Button>
      </div>
    </div>
  );
}
