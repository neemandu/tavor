import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  // Auth check
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  }

  // Parse body
  const body = await request.json().catch(() => ({}));
  const { letter } = body as { letter?: string };

  if (!letter || typeof letter !== "string") {
    return NextResponse.json({ error: "שדה letter נדרש" }, { status: 400 });
  }

  const adminSupabase = createAdminClient();

  // Upsert letter progress
  const { error: progressError } = await adminSupabase
    .from("letter_progress")
    .upsert(
      {
        user_id: user.id,
        letter,
        completed_at: new Date().toISOString(),
      },
      { onConflict: "user_id,letter" }
    );

  if (progressError) {
    console.error("letter_progress upsert error:", progressError);
    return NextResponse.json({ error: "שגיאה בשמירת התקדמות" }, { status: 500 });
  }

  // Award 2 points for learning the letter
  const { error: pointsError } = await adminSupabase.from("user_points").insert({
    user_id: user.id,
    points: 2,
    reason: "letter_learned",
    metadata: { letter },
  });

  if (pointsError) {
    console.error("user_points insert error:", pointsError);
    // Non-fatal — continue
  }

  // Update streak
  try {
    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

    const { data: streakData } = await adminSupabase
      .from("user_streaks")
      .select("current_streak, longest_streak, last_activity_date")
      .eq("user_id", user.id)
      .maybeSingle();

    let newStreak = 1;
    let longestStreak = 1;

    if (streakData) {
      const lastDate = streakData.last_activity_date;
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split("T")[0];

      if (lastDate === today) {
        // Already recorded today — keep current streak
        newStreak = streakData.current_streak;
        longestStreak = streakData.longest_streak;
      } else if (lastDate === yesterdayStr) {
        // Consecutive day — increment
        newStreak = streakData.current_streak + 1;
        longestStreak = Math.max(streakData.longest_streak, newStreak);
      } else {
        // Streak broken — reset to 1
        newStreak = 1;
        longestStreak = Math.max(streakData.longest_streak, 1);
      }
    }

    const { error: streakError } = await adminSupabase
      .from("user_streaks")
      .upsert(
        {
          user_id: user.id,
          current_streak: newStreak,
          longest_streak: longestStreak,
          last_activity_date: today,
        },
        { onConflict: "user_id" }
      );

    if (streakError) {
      console.error("user_streaks upsert error:", streakError);
    }

    // Award 5 streak bonus points if streak is active (and not already recorded today)
    const wasAlreadyToday = streakData?.last_activity_date === today;
    if (!wasAlreadyToday && newStreak > 0) {
      await adminSupabase.from("user_points").insert({
        user_id: user.id,
        points: 5,
        reason: "streak_bonus",
        metadata: { streak: newStreak, date: today },
      });
    }
  } catch (streakErr) {
    console.error("streak update error:", streakErr);
    // Non-fatal — continue
  }

  return NextResponse.json({ ok: true });
}
