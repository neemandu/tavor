import { createClient, createAdminClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  }

  const { enrichmentId } = (await request.json()) as { enrichmentId: string };
  if (!enrichmentId) {
    return NextResponse.json({ error: "enrichmentId נדרש" }, { status: 400 });
  }

  const adminSupabase = createAdminClient();

  // Award 3 points for viewing enrichment
  await adminSupabase.from("user_points").insert({
    user_id: user.id,
    points: 3,
    reason: "enrichment_view",
    metadata: { enrichmentId },
  });

  // Update daily streak
  const today = new Date().toISOString().slice(0, 10);
  const { data: existing } = await adminSupabase
    .from("user_streaks")
    .select("current_streak, longest_streak, last_activity_date")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!existing) {
    await adminSupabase.from("user_streaks").insert({
      user_id: user.id,
      current_streak: 1,
      longest_streak: 1,
      last_activity_date: today,
    });
  } else {
    const last = existing.last_activity_date;
    if (last !== today) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().slice(0, 10);

      const newStreak = last === yesterdayStr ? existing.current_streak + 1 : 1;
      const newLongest = Math.max(newStreak, existing.longest_streak ?? 0);

      await adminSupabase
        .from("user_streaks")
        .update({
          current_streak: newStreak,
          longest_streak: newLongest,
          last_activity_date: today,
        })
        .eq("user_id", user.id);
    }
  }

  return NextResponse.json({ ok: true });
}
