import { createClient, createAdminClient } from "@/lib/supabase/server";
import type { LetterStat } from "@/lib/letter-exercises";

// Per-letter recognition state for the current user: correct count (from
// letter_practice) + mastered flag (from letter_progress, the source of truth).
export async function loadLetterStats(): Promise<Record<string, LetterStat>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return {};

  const admin = createAdminClient();
  const [{ data: practice }, { data: progress }] = await Promise.all([
    admin.from("letter_practice").select("letter, correct_count").eq("user_id", user.id),
    admin.from("letter_progress").select("letter").eq("user_id", user.id),
  ]);

  const mastered = new Set((progress ?? []).map((r) => r.letter as string));
  const stats: Record<string, LetterStat> = {};
  for (const row of practice ?? []) {
    const letter = row.letter as string;
    stats[letter] = {
      correct: (row.correct_count as number) ?? 0,
      mastered: mastered.has(letter),
    };
  }
  for (const id of mastered) {
    if (!stats[id]) stats[id] = { correct: 0, mastered: true };
  }
  return stats;
}
