export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { StudentShell } from "@/components/student-shell";
import { LETTER_BY_ID } from "@/lib/letter-exercises";
import { loadLetterStats } from "@/lib/letter-stats";
import { LetterPracticeSession } from "../practice/letter-practice-session";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function LetterPage({ params }: PageProps) {
  const { id } = await params;
  if (!LETTER_BY_ID[id]) notFound();

  const stats = await loadLetterStats();

  return (
    <StudentShell>
      <LetterPracticeSession mode="focused" letterId={id} initialStats={stats} />
    </StudentShell>
  );
}
