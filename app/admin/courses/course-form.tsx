"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { PlusCircle } from "lucide-react";
import { useRouter } from "next/navigation";

export function CourseForm() {
  const [name, setName] = useState("");
  const [type, setType] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/admin/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), type: type || null }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "שגיאה ביצירת קורס");
      }
      toast.success(`קורס "${name}" נוסף`);
      setName("");
      setType("");
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
          הוספת קורס
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-wrap gap-3 items-end">
          <div className="space-y-1.5 min-w-[200px]">
            <Label>שם הקורס</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="קורס ערבית שנתי תשפ״ה"
              required
            />
          </div>
          <div className="space-y-1.5 min-w-[160px]">
            <Label>סוג</Label>
            <Select value={type} onValueChange={(v) => setType(v ?? "")}>
              <SelectTrigger>
                <SelectValue placeholder="בחר סוג">
                  {type ? ({ year: "שנתי", "8_weeks": "8 שבועות", "5_weeks": "5 שבועות" } as Record<string, string>)[type] : undefined}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="year">שנתי</SelectItem>
                <SelectItem value="8_weeks">8 שבועות</SelectItem>
                <SelectItem value="5_weeks">5 שבועות</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" disabled={loading}>
            {loading ? "יוצר..." : "צור קורס"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
