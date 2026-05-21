export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { StudentShell } from "@/components/student-shell";
import { ARABIC_LETTERS } from "@/lib/arabic-letters";
import { LetterPractice } from "./letter-practice";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function LetterPage({ params }: PageProps) {
  const { id } = await params;

  const letter = ARABIC_LETTERS.find((l) => l.id === id);
  if (!letter) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let alreadyMastered = false;

  if (user) {
    const { data } = await supabase
      .from("letter_progress")
      .select("letter")
      .eq("user_id", user.id)
      .eq("letter", id)
      .maybeSingle();

    alreadyMastered = data !== null;
  }

  return (
    <StudentShell>
      <LetterPractice letter={letter} alreadyMastered={alreadyMastered} />
    </StudentShell>
  );
}
