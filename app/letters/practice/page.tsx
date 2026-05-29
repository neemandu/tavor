export const dynamic = "force-dynamic";

import { StudentShell } from "@/components/student-shell";
import { loadLetterStats } from "@/lib/letter-stats";
import { LetterPracticeSession } from "./letter-practice-session";

export default async function LettersPracticePage() {
  const stats = await loadLetterStats();
  return (
    <StudentShell>
      <LetterPracticeSession mode="mixed" initialStats={stats} />
    </StudentShell>
  );
}
