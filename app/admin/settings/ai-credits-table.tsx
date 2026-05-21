"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Save } from "lucide-react";

type Student = {
  id: string;
  name: string;
  monthly_limit: number;
  current_month_usage: number;
};

function StudentCreditRow({ student }: { student: Student }) {
  const [limit, setLimit] = useState(student.monthly_limit);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/settings/credits/${student.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ monthly_limit: limit }),
      });
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        throw new Error(data.error ?? "שגיאה לא ידועה");
      }
      toast.success(`עודכן עבור ${student.name}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "שגיאה בשמירה");
    } finally {
      setSaving(false);
    }
  }

  return (
    <tr className="border-b last:border-0">
      <td className="p-3 font-medium">{student.name}</td>
      <td className="p-3 w-40">
        <Input
          type="number"
          min={0}
          max={500}
          value={limit}
          onChange={(e) => setLimit(Number(e.target.value))}
          className="w-24 h-8"
        />
      </td>
      <td className="p-3 w-52">
        <div className="space-y-1">
          <Progress value={student.current_month_usage} max={limit} />
          <p className="text-xs text-muted-foreground">
            {student.current_month_usage} / {limit}
          </p>
        </div>
      </td>
      <td className="p-3">
        <Button
          size="sm"
          variant="outline"
          onClick={handleSave}
          disabled={saving || limit === student.monthly_limit}
          className="gap-1.5"
        >
          <Save className="size-3.5" />
          {saving ? "שומר..." : "שמור"}
        </Button>
      </td>
    </tr>
  );
}

export function AiCreditsTable({ students }: { students: Student[] }) {
  if (students.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground text-center">
          אין חניכים במערכת
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="p-3 text-start font-medium">שם</th>
              <th className="p-3 text-start font-medium">מכסה חודשית</th>
              <th className="p-3 text-start font-medium">שימוש חודשי</th>
              <th className="p-3 text-start font-medium">פעולות</th>
            </tr>
          </thead>
          <tbody>
            {students.map((student) => (
              <StudentCreditRow key={student.id} student={student} />
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
