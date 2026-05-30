import { createClient, createAdminClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { AI_CONFIG_KEYS } from "@/lib/ai-config";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.user_metadata?.role !== "admin") return null;
  return user;
}

export async function PATCH(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const values = (body.values ?? {}) as Record<string, unknown>;

  const rows = Object.entries(values)
    .filter(([k]) => (AI_CONFIG_KEYS as readonly string[]).includes(k))
    .map(([key, value]) => ({
      key,
      value: typeof value === "string" ? value : "",
      updated_at: new Date().toISOString(),
    }));

  if (rows.length === 0) {
    return NextResponse.json({ error: "אין נתונים לשמירה" }, { status: 400 });
  }

  const db = createAdminClient();
  const { error } = await db.from("app_config").upsert(rows, { onConflict: "key" });
  if (error) {
    console.error("ai-config upsert error:", error);
    return NextResponse.json({ error: "שגיאה בשמירת ההגדרות" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
