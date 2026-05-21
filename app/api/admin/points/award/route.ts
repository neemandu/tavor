import { createClient, createAdminClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

const VALID_REASONS = [
  "scenario_complete",
  "exam_score",
  "daily_streak",
  "enrichment_view",
  "letter_learned",
] as const;

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.user_metadata?.role !== "admin") return null;
  return user;
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  }

  const body = (await request.json()) as {
    user_id?: string;
    points?: number;
    reason?: string;
    metadata?: Record<string, unknown>;
  };

  const { user_id, points, reason, metadata } = body;

  if (!user_id || typeof user_id !== "string") {
    return NextResponse.json({ error: "user_id חסר" }, { status: 400 });
  }

  if (typeof points !== "number" || points <= 0) {
    return NextResponse.json({ error: "ערך נקודות לא תקין" }, { status: 400 });
  }

  if (!reason || !(VALID_REASONS as readonly string[]).includes(reason)) {
    return NextResponse.json(
      { error: `סיבה לא תקינה. ערכים מותרים: ${VALID_REASONS.join(", ")}` },
      { status: 400 }
    );
  }

  const adminSupabase = createAdminClient();

  const { error } = await adminSupabase.from("user_points").insert({
    user_id,
    points,
    reason,
    metadata: metadata ?? {},
  });

  if (error) {
    console.error("Error inserting points:", error);
    return NextResponse.json({ error: "שגיאה בשמירת הנקודות" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
