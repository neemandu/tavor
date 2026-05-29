import { createClient, createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { levelFromXp } from "@/lib/levels";

export const dynamic = "force-dynamic";

// Lifetime XP / level / streak for the current user.
// XP is summed across ALL courses (no course filter) so the level is stable
// regardless of which course leaderboard is being viewed.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  }

  const adminSupabase = createAdminClient();

  const [{ data: pointsRows }, { data: streak }] = await Promise.all([
    adminSupabase.from("user_points").select("points").eq("user_id", user.id),
    adminSupabase
      .from("user_streaks")
      .select("current_streak")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  const xp = (pointsRows ?? []).reduce(
    (sum, row) => sum + ((row.points as number) ?? 0),
    0
  );

  return NextResponse.json({
    xp,
    level: levelFromXp(xp),
    currentStreak: (streak?.current_streak as number | null) ?? 0,
  });
}
