import { createClient, createAdminClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

const VALID_REASONS = [
  "scenario_complete",
  "exam_score",
  "daily_streak",
  "enrichment_view",
  "letter_learned",
] as const;

type PointsReason = (typeof VALID_REASONS)[number];

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  }

  const body = await request.json() as {
    points?: number;
    reason?: string;
    metadata?: Record<string, unknown>;
  };

  const { points, reason, metadata } = body;

  if (typeof points !== "number" || points <= 0) {
    return NextResponse.json({ error: "ערך נקודות לא תקין" }, { status: 400 });
  }

  if (!reason || !(VALID_REASONS as readonly string[]).includes(reason)) {
    return NextResponse.json(
      {
        error: `סיבה לא תקינה. ערכים מותרים: ${VALID_REASONS.join(", ")}`,
      },
      { status: 400 }
    );
  }

  const adminSupabase = createAdminClient();
  const today = new Date().toISOString().split("T")[0];

  // Insert the points record
  const { error: pointsError } = await adminSupabase.from("user_points").insert({
    user_id: user.id,
    points,
    reason: reason as PointsReason,
    metadata: metadata ?? {},
  });

  if (pointsError) {
    console.error("Error inserting points:", pointsError);
    return NextResponse.json({ error: "שגיאה בשמירת הנקודות" }, { status: 500 });
  }

  // Handle daily streak logic
  const { data: streakData } = await adminSupabase
    .from("user_streaks")
    .select("current_streak, longest_streak, last_activity_date")
    .eq("user_id", user.id)
    .maybeSingle();

  const lastActivity = streakData?.last_activity_date as string | null;
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

  let newStreak = 1;
  const currentStreak = (streakData?.current_streak as number | null) ?? 0;
  const longestStreak = (streakData?.longest_streak as number | null) ?? 0;

  if (streakData) {
    if (lastActivity === yesterday) {
      // Continuing streak
      newStreak = currentStreak + 1;
    } else if (lastActivity === today) {
      // Already logged today — keep streak, don't re-award
      newStreak = currentStreak;
    } else {
      // Streak broken or first time
      newStreak = 1;
    }
  }

  const shouldAwardStreakPoints = lastActivity !== today;

  await adminSupabase.from("user_streaks").upsert(
    {
      user_id: user.id,
      current_streak: newStreak,
      longest_streak: Math.max(newStreak, longestStreak),
      last_activity_date: today,
    },
    { onConflict: "user_id" }
  );

  // Award 5 bonus points for maintaining streak (once per day)
  if (shouldAwardStreakPoints && newStreak > 1) {
    await adminSupabase.from("user_points").insert({
      user_id: user.id,
      points: 5,
      reason: "daily_streak" as PointsReason,
      metadata: { current_streak: newStreak },
    });
  }

  // Get updated total
  const { data: totals } = await adminSupabase
    .from("user_points")
    .select("points")
    .eq("user_id", user.id);

  const total_points = (totals ?? []).reduce(
    (sum, row) => sum + (row.points as number),
    0
  );

  return NextResponse.json({ ok: true, total_points });
}
