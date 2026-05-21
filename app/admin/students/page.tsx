export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreateStudentForm } from "./create-student-form";
import { Users, ExternalLink } from "lucide-react";
import Link from "next/link";

export default async function AdminStudentsPage() {
  const supabase = await createClient();

  const { data: studentsData } = await supabase
    .from("users")
    .select("id, name, created_at, user_course_access(courses(name))")
    .eq("role", "student")
    .order("name");
  const students = studentsData ?? [];

  const { data: coursesData } = await supabase
    .from("courses")
    .select("id, name")
    .eq("is_active", true)
    .order("name");
  const courses = (coursesData ?? []) as { id: string; name: string }[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">חניכים</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{students.length} חניכים</p>
      </div>

      <CreateStudentForm courses={courses} />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="size-4" />
            רשימת חניכים ({students.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {students.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">עדיין לא נוספו חניכים</p>
          ) : (
            <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="p-3 text-start font-medium">שם</th>
                  <th className="p-3 text-start font-medium">קורס</th>
                  <th className="p-3 text-start font-medium hidden sm:table-cell">נרשם</th>
                  <th className="p-3 text-start font-medium">פרופיל</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => {
                  const courseAccess = s.user_course_access as unknown as Array<{
                    courses: { name: string } | null;
                  }>;
                  const courseNames = courseAccess
                    .map((uca) => uca.courses?.name)
                    .filter(Boolean);
                  return (
                    <tr key={s.id} className="border-b last:border-0">
                      <td className="p-3 font-medium">{s.name}</td>
                      <td className="p-3">
                        {courseNames.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {courseNames.map((n) => (
                              <Badge key={n} variant="secondary" className="text-xs">
                                {n}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">ללא קורס</span>
                        )}
                      </td>
                      <td className="p-3 text-muted-foreground hidden sm:table-cell">
                        {new Date(s.created_at).toLocaleDateString("he-IL")}
                      </td>
                      <td className="p-3">
                        <Link
                          href={`/admin/students/${s.id}`}
                          className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                        >
                          <ExternalLink className="size-3.5 shrink-0" />
                          <span className="hidden sm:inline">צפה בפרופיל</span>
                          <span className="sm:hidden">פרופיל</span>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
