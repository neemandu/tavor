import { createClient, createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { evaluateAndGrantAchievements } from "@/lib/achievements-server";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.user_metadata?.role !== "admin") return null;
  return user;
}

// One-off: evaluate the achievement catalog for every student so users who
// already passed thresholds get their badges without waiting for a new award.
export async function POST() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  }

  const adminSupabase = createAdminClient();
  const { data: students, error } = await adminSupabase
    .from("users")
    .select("id")
    .eq("role", "student");

  if (error) {
    console.error("backfill students query failed:", error);
    return NextResponse.json({ error: "שגיאה בשליפת חניכים" }, { status: 500 });
  }

  for (const s of students ?? []) {
    await evaluateAndGrantAchievements(s.id as string);
  }

  return NextResponse.json({ ok: true, processed: (students ?? []).length });
}
