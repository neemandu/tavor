import { createClient, createAdminClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { LETTERS_PLAYLIST_KEY, extractPlaylistId } from "@/lib/letters-video-config";

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
  const url = typeof body.url === "string" ? body.url.trim() : "";

  // An empty value clears the override (falls back to the default playlist).
  if (url && !extractPlaylistId(url)) {
    return NextResponse.json(
      { error: "הקישור אינו תקין — צריך להיות קישור לפלייליסט יוטיוב" },
      { status: 400 }
    );
  }

  const db = createAdminClient();
  const { error } = await db.from("app_config").upsert(
    { key: LETTERS_PLAYLIST_KEY, value: url, updated_at: new Date().toISOString() },
    { onConflict: "key" }
  );
  if (error) {
    console.error("letters-video upsert error:", error);
    return NextResponse.json({ error: "שגיאה בשמירת ההגדרות" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
