import { createClient, createAdminClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.user_metadata?.role !== "admin") return null;
  return user;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  }

  const { userId } = await params;
  const body = await request.json() as { monthly_limit?: number };
  const { monthly_limit } = body;

  if (typeof monthly_limit !== "number" || monthly_limit < 0) {
    return NextResponse.json({ error: "ערך מכסה לא תקין" }, { status: 400 });
  }

  const adminSupabase = createAdminClient();

  const { error } = await adminSupabase.from("ai_credits").upsert(
    {
      user_id: userId,
      monthly_limit,
    },
    { onConflict: "user_id" }
  );

  if (error) {
    console.error("Error upserting ai_credits:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
