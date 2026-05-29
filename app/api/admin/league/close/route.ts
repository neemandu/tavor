import { createClient, createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.user_metadata?.role !== "admin") return null;
  return user;
}

// Manually trigger the weekly league close (promotion/relegation + champions).
// Normally run by pg_cron; this is for testing / on-demand settlement.
export async function POST() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  }

  const adminSupabase = createAdminClient();
  const { error } = await adminSupabase.rpc("close_league_week");

  if (error) {
    console.error("close_league_week RPC error:", error);
    return NextResponse.json({ error: "שגיאה בסגירת השבוע" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
