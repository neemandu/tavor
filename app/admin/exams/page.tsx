export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UploadExamForm } from "./upload-exam-form";
import { GradeTable } from "./grade-table";
import { CourseFilterBar } from "./course-filter-bar";
import { FileText } from "lucide-react";

export default async function AdminExamsPage({
  searchParams,
}: {
  searchParams: Promise<{ course_id?: string }>;
}) {
  const { course_id: selectedCourseId } = await searchParams;
  const supabase = await createClient();

  const { data: coursesData } = await supabase
    .from("courses")
    .select("id, name")
    .eq("is_active", true);
  const courses = (coursesData ?? []) as { id: string; name: string }[];

  // Fetch exams, optionally filtered by course
  let examsQuery = supabase
    .from("exams")
    .select("id, name, due_date, created_at, course_id")
    .order("created_at", { ascending: false });

  if (selectedCourseId) {
    examsQuery = examsQuery.eq("course_id", selectedCourseId);
  }

  const { data: examsData } = await examsQuery;
  const exams = examsData ?? [];

  // Fetch students, optionally filtered by course enrollment
  let studentsQuery = supabase
    .from("users")
    .select("id, name")
    .eq("role", "student")
    .order("name");

  const { data: studentsData } = await studentsQuery;
  const allStudents = (studentsData ?? []) as { id: string; name: string }[];

  // If a course filter is active, get the enrolled student IDs for that course
  let enrolledStudentIds: Set<string> | null = null;
  if (selectedCourseId) {
    const { data: accessData } = await supabase
      .from("user_course_access")
      .select("user_id")
      .eq("course_id", selectedCourseId);
    enrolledStudentIds = new Set(
      (accessData ?? []).map((a) => (a as { user_id: string }).user_id)
    );
  }

  const students =
    enrolledStudentIds !== null
      ? allStudents.filter((s) => enrolledStudentIds!.has(s.id))
      : allStudents;

  const { data: submissionsData } = await supabase
    .from("exam_submissions")
    .select("exam_id, user_id, submitted_at, users(name)");
  const submissions = (submissionsData ?? []) as unknown as {
    exam_id: string;
    user_id: string;
    submitted_at: string;
    users: { name: string } | null;
  }[];

  const { data: gradesData } = await supabase
    .from("grades")
    .select("exam_id, user_id, score");
  const grades = (gradesData ?? []) as { exam_id: string; user_id: string; score: number }[];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">מבחנים</h1>

      <UploadExamForm courses={courses} />

      <CourseFilterBar courses={courses} selected={selectedCourseId ?? ""} />

      {exams.map((exam) => {
        const examSubmissions = submissions.filter((s) => s.exam_id === exam.id);
        const examGrades = grades.filter((g) => g.exam_id === exam.id);

        return (
          <Card key={exam.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="size-4" />
                  {exam.name}
                </CardTitle>
                <div className="flex items-center gap-2">
                  {exam.due_date && (
                    <span className="text-xs text-muted-foreground">
                      הגשה עד: {new Date(exam.due_date).toLocaleDateString("he-IL")}
                    </span>
                  )}
                  <Badge variant="secondary" className="text-xs">
                    {examSubmissions.length} הגשות
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <GradeTable
                examId={exam.id}
                students={students}
                submissions={examSubmissions}
                grades={examGrades}
              />
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
