export const dynamic = "force-dynamic";

import { createAdminClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CourseForm } from "./course-form";
import { CourseToggle } from "./course-toggle";
import { LeaderboardToggle } from "./leaderboard-toggle";

export default async function AdminCoursesPage() {
  const supabase = createAdminClient();

  const { data: coursesData } = await supabase
    .from("courses")
    .select("*")
    .order("created_at", { ascending: false });
  const courses = coursesData ?? [];

  const TYPE_LABELS: Record<string, string> = {
    year: "שנתי",
    "8_weeks": "8 שבועות",
    "5_weeks": "5 שבועות",
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">קורסים</h1>

      <CourseForm />

      <div className="space-y-3">
        {courses.length === 0 ? (
          <p className="text-sm text-muted-foreground">עדיין לא נוצרו קורסים</p>
        ) : (
          courses.map((course) => (
            <Card key={course.id}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="flex-1">
                  <p className="font-semibold">{course.name}</p>
                  {course.type && (
                    <p className="text-sm text-muted-foreground">
                      {TYPE_LABELS[course.type] ?? course.type}
                    </p>
                  )}
                </div>
                <Badge variant={course.is_active ? "default" : "secondary"}>
                  {course.is_active ? "פעיל" : "לא פעיל"}
                </Badge>
                <Badge variant={course.show_leaderboard !== false ? "outline" : "secondary"}>
                  {course.show_leaderboard !== false ? "מוצג" : "מוסתר"}
                </Badge>
                <CourseToggle courseId={course.id} isActive={course.is_active} />
                <LeaderboardToggle courseId={course.id} showLeaderboard={course.show_leaderboard !== false} />
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
