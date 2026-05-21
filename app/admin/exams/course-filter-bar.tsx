"use client";

import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface Props {
  courses: { id: string; name: string }[];
  selected: string;
}

export function CourseFilterBar({ courses, selected }: Props) {
  const router = useRouter();

  function select(courseId: string) {
    if (courseId === "") {
      router.push("/admin/exams");
    } else {
      router.push(`/admin/exams?course_id=${courseId}`);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => select("")}
        className={cn(
          "px-3 py-1.5 rounded-full text-sm font-medium border transition-colors",
          selected === ""
            ? "bg-primary text-primary-foreground border-primary"
            : "bg-background text-muted-foreground border-border hover:text-foreground hover:border-foreground/40"
        )}
      >
        כל הקורסים
      </button>
      {courses.map((course) => (
        <button
          key={course.id}
          onClick={() => select(course.id)}
          className={cn(
            "px-3 py-1.5 rounded-full text-sm font-medium border transition-colors",
            selected === course.id
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-background text-muted-foreground border-border hover:text-foreground hover:border-foreground/40"
          )}
        >
          {course.name}
        </button>
      ))}
    </div>
  );
}
