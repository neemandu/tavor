"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";

interface Course {
  id: string;
  name: string;
}

export function CreateStudentForm({ courses }: { courses: Course[] }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [courseId, setCourseId] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, courseId: courseId || null }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "שגיאה ביצירת חניך");
      }

      toast.success(`חניך ${name} נוסף בהצלחה`);
      setName("");
      setEmail("");
      setPassword("");
      setCourseId("");
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
          <UserPlus className="size-4" />
          הוספת חניך חדש
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>שם מלא</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ישראל ישראלי"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label>אימייל</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="israel@idf.il"
              required
              dir="ltr"
            />
          </div>
          <div className="space-y-1.5">
            <Label>סיסמה זמנית</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="לפחות 8 תווים"
              minLength={8}
              required
              dir="ltr"
            />
          </div>
          <div className="space-y-1.5">
            <Label>קורס</Label>
            <Select value={courseId} onValueChange={(v) => setCourseId(v ?? "")}>
              <SelectTrigger>
                <SelectValue placeholder="בחר קורס (אופציונלי)">
                  {courseId ? courses.find((c) => c.id === courseId)?.name : undefined}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {courses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={loading} className="w-full sm:w-auto">
              {loading ? "מוסיף..." : "הוסף חניך"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
