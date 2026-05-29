"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { PlusCircle } from "lucide-react";
import { useRouter } from "next/navigation";

export function AddEnrichmentForm() {
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !url.trim()) return;

    setLoading(true);
    try {
      const res = await fetch("/api/admin/enrichment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          url: url.trim(),
          description: description.trim() || undefined,
          thumbnail_url: thumbnailUrl.trim() || undefined,
          category: category || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json() as { error?: string };
        throw new Error(err.error ?? "שגיאה בהוספת הפריט");
      }

      toast.success(`"${title}" נוסף בהצלחה`);
      setTitle("");
      setUrl("");
      setDescription("");
      setThumbnailUrl("");
      setCategory("");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "שגיאה");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <PlusCircle className="size-4" />
          הוספת תוכן העשרה
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="enrich-title">כותרת *</Label>
              <Input
                id="enrich-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="שם התוכן"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="enrich-url">קישור *</Label>
              <Input
                id="enrich-url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://..."
                dir="ltr"
                type="url"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="enrich-thumbnail">תמונה ממוזערת (URL)</Label>
              <Input
                id="enrich-thumbnail"
                value={thumbnailUrl}
                onChange={(e) => setThumbnailUrl(e.target.value)}
                placeholder="https://..."
                dir="ltr"
              />
            </div>

            <div className="space-y-1.5">
              <Label>קטגוריה</Label>
              <Select value={category} onValueChange={(v) => setCategory(v ?? "")}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="בחר קטגוריה">
                    {category ? ({ culture: "תרבות", geography: "גיאוגרפיה", religion: "דת", levantine: "לבנטיני", other: "אחר" } as Record<string, string>)[category] : undefined}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="culture">תרבות</SelectItem>
                  <SelectItem value="geography">גיאוגרפיה</SelectItem>
                  <SelectItem value="religion">דת</SelectItem>
                  <SelectItem value="levantine">לבנטיני</SelectItem>
                  <SelectItem value="other">אחר</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="enrich-desc">תיאור</Label>
            <Textarea
              id="enrich-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="תיאור קצר של התוכן (אופציונלי)"
              rows={3}
            />
          </div>

          <Button type="submit" disabled={loading}>
            {loading ? "מוסיף..." : "הוסף תוכן"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
