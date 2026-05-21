export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { StudentShell } from "@/components/student-shell";
import { ARABIC_LETTERS } from "@/lib/arabic-letters";
import { LettersGrid } from "./letters-grid";

export default async function LettersPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let mastered: string[] = [];

  if (user) {
    const { data } = await supabase
      .from("letter_progress")
      .select("letter")
      .eq("user_id", user.id);

    mastered = (data ?? []).map((row: { letter: string }) => row.letter);
  }

  const total = ARABIC_LETTERS.length;
  const masteredCount = mastered.length;
  const progressPct = Math.round((masteredCount / total) * 100);

  return (
    <StudentShell>
      <div className="p-4 max-w-2xl mx-auto space-y-5">
        <div className="pt-2">
          <h1 className="text-xl font-bold">לימוד אותיות ערבית</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            לחץ על אות כדי לתרגל כתיבה
          </p>
        </div>

        {/* Progress */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">התקדמות</span>
            <span className="font-medium">
              {masteredCount}/{total} אותיות
            </span>
          </div>
          <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-green-500 transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* Grid */}
        <LettersGrid letters={ARABIC_LETTERS} mastered={mastered} />
      </div>
    </StudentShell>
  );
}
