export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { StudentShell } from "@/components/student-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SubmitExamButton } from "./submit-button";
import { DownloadExamButton } from "./download-button";
import { FileText, Award } from "lucide-react";

export default async function ExamsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Active exams
  const { data: examsData } = await supabase
    .from("exams")
    .select("id, name, due_date, file_path")
    .order("due_date", { ascending: true });
  const exams = examsData ?? [];

  // Student's submissions
  const { data: submissionsData } = await supabase
    .from("exam_submissions")
    .select("exam_id")
    .eq("user_id", user!.id);
  const submissions = submissionsData ?? [];

  const submittedExamIds = new Set(submissions.map((s) => s.exam_id));

  // Student's grades
  const { data: gradesData } = await supabase
    .from("grades")
    .select("exam_id, score, created_at, exams(name)")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false });
  const grades = gradesData ?? [];

  return (
    <StudentShell>
      <div className="p-4 max-w-lg mx-auto space-y-6">
        <h1 className="text-xl font-bold pt-2">מבחנים</h1>

        {/* Active exams */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5">
            <FileText className="size-4" /> מבחנים פעילים
          </h2>

          {exams.length === 0 ? (
            <p className="text-sm text-muted-foreground">אין מבחנים פעילים כרגע</p>
          ) : (
            exams.map((exam) => {
              const submitted = submittedExamIds.has(exam.id);
              return (
                <Card key={exam.id}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium">{exam.name}</p>
                        {exam.due_date && (
                          <p className="text-xs text-muted-foreground">
                            הגשה עד:{" "}
                            {new Date(exam.due_date).toLocaleDateString("he-IL")}
                          </p>
                        )}
                      </div>
                      {submitted && (
                        <Badge className="text-xs shrink-0 bg-green-100 text-green-700 border-green-200">
                          הוגש ✓
                        </Badge>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <DownloadExamButton
                        examId={exam.id}
                        filePath={exam.file_path}
                        examName={exam.name}
                      />
                      {!submitted && (
                        <SubmitExamButton
                          examId={exam.id}
                          examName={exam.name}
                          studentId={user!.id}
                        />
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </section>

        {/* Grades */}
        {grades.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5">
              <Award className="size-4" /> הציונים שלי
            </h2>

            <Card>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40">
                      <th className="p-3 text-start font-medium">מבחן</th>
                      <th className="p-3 text-start font-medium">תאריך</th>
                      <th className="p-3 text-end font-medium">ציון</th>
                    </tr>
                  </thead>
                  <tbody>
                    {grades.map((grade) => (
                      <tr key={grade.exam_id} className="border-b last:border-0 odd:bg-muted/20">
                        <td className="p-3">
                          {(grade.exams as unknown as { name: string } | null)?.name ?? "—"}
                        </td>
                        <td className="p-3 text-muted-foreground">
                          {new Date(grade.created_at).toLocaleDateString("he-IL")}
                        </td>
                        <td className="p-3 text-end font-bold">
                          <span
                            className={
                              grade.score >= 80
                                ? "text-green-600"
                                : grade.score >= 60
                                ? "text-yellow-600"
                                : "text-red-600"
                            }
                          >
                            {grade.score}/100
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </section>
        )}
      </div>
    </StudentShell>
  );
}
