export const dynamic = "force-dynamic";

import { createAdminClient } from "@/lib/supabase/server";
import { AdminShell } from "@/components/admin-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { levelFromXp } from "@/lib/levels";
import Link from "next/link";
import { ArrowRight, User } from "lucide-react";
import { notFound } from "next/navigation";

export default async function StudentProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createAdminClient();

  // 1. Student user
  const { data: studentData } = await supabase
    .from("users")
    .select("id, name, role, created_at")
    .eq("id", id)
    .maybeSingle();

  if (!studentData || studentData.role !== "student") {
    notFound();
  }

  // 2. Courses enrolled
  const { data: coursesData } = await supabase
    .from("user_course_access")
    .select("courses(name)")
    .eq("user_id", id);

  const courses = (coursesData ?? []) as unknown as Array<{
    courses: { name: string } | null;
  }>;

  // 3. Grades with exam names
  const { data: gradesData } = await supabase
    .from("grades")
    .select("score, created_at, exams(name)")
    .eq("user_id", id)
    .order("created_at", { ascending: false });

  const grades = (gradesData ?? []) as unknown as Array<{
    score: number;
    created_at: string;
    exams: { name: string } | null;
  }>;

  // 4. AI sessions with scenario names
  const { data: sessionsData } = await supabase
    .from("ai_sessions")
    .select("session_type, started_at, tokens_used, feedback_text, scenarios(name)")
    .eq("user_id", id)
    .order("started_at", { ascending: false });

  const sessions = (sessionsData ?? []) as unknown as Array<{
    session_type: string | null;
    started_at: string;
    tokens_used: number | null;
    feedback_text: string | null;
    scenarios: { name: string } | null;
  }>;

  // 5. Total points
  const { data: pointsData } = await supabase
    .from("user_points")
    .select("points")
    .eq("user_id", id);

  const totalPoints = (pointsData ?? []).reduce(
    (sum, row) => sum + ((row.points as number) ?? 0),
    0
  );

  const courseNames = courses
    .map((c) => c.courses?.name)
    .filter(Boolean) as string[];

  const SESSION_TYPE_LABELS: Record<string, string> = {
    scenario: "תרחיש",
    free_practice: "תרגול חופשי",
    free_conversation: "שיחה חופשית",
  };

  return (
    <AdminShell>
      <div className="space-y-6 max-w-3xl">
        {/* Back link */}
        <Link
          href="/admin/students"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowRight className="size-4" />
          חזרה לרשימת חניכים
        </Link>

        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-full bg-muted">
            <User className="size-6 text-muted-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{studentData.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary">חניך</Badge>
              <span className="text-sm text-muted-foreground">
                נרשם: {new Date(studentData.created_at).toLocaleDateString("he-IL")}
              </span>
            </div>
          </div>
        </div>

        {/* Courses enrolled */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">קורסים</CardTitle>
          </CardHeader>
          <CardContent>
            {courseNames.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {courseNames.map((name) => (
                  <Badge key={name} variant="outline">
                    {name}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">לא משויך לקורס</p>
            )}
          </CardContent>
        </Card>

        {/* Total points + level */}
        <Card>
          <CardContent className="p-4 flex items-center gap-6">
            <div>
              <p className="text-sm text-muted-foreground">סה״כ נקודות</p>
              <p className="text-3xl font-bold">{totalPoints.toLocaleString("he-IL")}</p>
            </div>
            <div className="w-px h-12 bg-border" />
            <div>
              <p className="text-sm text-muted-foreground">רמה</p>
              <p className="text-3xl font-bold">{levelFromXp(totalPoints)}</p>
            </div>
          </CardContent>
        </Card>

        {/* Grades table */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">ציונים</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {grades.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">אין ציונים עדיין</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="p-3 text-start font-medium">מבחן</th>
                    <th className="p-3 text-start font-medium">ציון</th>
                    <th className="p-3 text-start font-medium">תאריך</th>
                  </tr>
                </thead>
                <tbody>
                  {grades.map((g, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="p-3">{g.exams?.name ?? "—"}</td>
                      <td className="p-3 font-semibold">{g.score}</td>
                      <td className="p-3 text-muted-foreground">
                        {new Date(g.created_at).toLocaleDateString("he-IL")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        {/* AI sessions table */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">שיחות AI</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {sessions.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">אין שיחות עדיין</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="p-3 text-start font-medium">סוג</th>
                    <th className="p-3 text-start font-medium">תרחיש</th>
                    <th className="p-3 text-start font-medium">תאריך</th>
                    <th className="p-3 text-start font-medium">טוקנים</th>
                    <th className="p-3 text-start font-medium">פידבק</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((s, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="p-3">
                        {s.session_type ? (SESSION_TYPE_LABELS[s.session_type] ?? s.session_type) : "—"}
                      </td>
                      <td className="p-3">{s.scenarios?.name ?? "חופשי"}</td>
                      <td className="p-3 text-muted-foreground">
                        {new Date(s.started_at).toLocaleDateString("he-IL")}
                      </td>
                      <td className="p-3 text-muted-foreground">
                        {s.tokens_used?.toLocaleString("he-IL") ?? "—"}
                      </td>
                      <td className="p-3">
                        {s.feedback_text ? (
                          <span className="text-green-600">✓</span>
                        ) : (
                          <span className="text-muted-foreground">✗</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminShell>
  );
}
