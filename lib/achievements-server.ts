import { createAdminClient } from "@/lib/supabase/server";
import { evaluateAchievements, type UserStats } from "@/lib/achievements";

// Builds a user's current stats from existing tables/ledger (no parallel counters).
export async function buildUserStats(userId: string): Promise<UserStats> {
  const supabase = createAdminClient();

  const [
    { data: pointsRows },
    { data: streak },
    { count: lettersLearned },
    { count: enrichmentViews },
    { count: scenariosCompleted },
  ] = await Promise.all([
    supabase.from("user_points").select("points").eq("user_id", userId),
    supabase
      .from("user_streaks")
      .select("current_streak, longest_streak")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("letter_progress")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId),
    supabase
      .from("user_points")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("reason", "enrichment_view"),
    supabase
      .from("user_points")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("reason", "scenario_complete"),
  ]);

  const lifetimeXp = (pointsRows ?? []).reduce(
    (sum, row) => sum + ((row.points as number) ?? 0),
    0
  );

  return {
    lifetimeXp,
    currentStreak: (streak?.current_streak as number | null) ?? 0,
    longestStreak: (streak?.longest_streak as number | null) ?? 0,
    lettersLearned: lettersLearned ?? 0,
    enrichmentViews: enrichmentViews ?? 0,
    scenariosCompleted: scenariosCompleted ?? 0,
  };
}

// Evaluates the catalog against the user's current stats and grants any newly
// earned achievements. Idempotent: re-granting preserves the original earned_at.
// Never throws — callers (awardPoints) must not fail because of achievements.
export async function evaluateAndGrantAchievements(userId: string): Promise<void> {
  try {
    const stats = await buildUserStats(userId);
    const earnedIds = evaluateAchievements(stats);
    if (earnedIds.length === 0) return;

    const supabase = createAdminClient();
    const { error } = await supabase.from("user_achievements").upsert(
      earnedIds.map((achievement_id) => ({ user_id: userId, achievement_id })),
      { onConflict: "user_id,achievement_id", ignoreDuplicates: true }
    );
    if (error) {
      console.error("evaluateAndGrantAchievements upsert failed:", error);
    }
  } catch (err) {
    console.error("evaluateAndGrantAchievements error:", err);
  }
}
