import { createClient, createAdminClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.user_metadata?.role !== "admin") return null;
  return user;
}

export async function POST(request: NextRequest) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });

  const body = await request.json() as {
    arabic_text: string;
    hebrew_translation: string;
    transliteration?: string | null;
    category?: string | null;
    inflections?: Record<string, string> | null;
    recording_path?: string | null;
  };

  if (!body.arabic_text?.trim() || !body.hebrew_translation?.trim()) {
    return NextResponse.json({ error: "שדות חובה חסרים" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase.from("vocabulary").insert({
    ...body,
    created_by: user.id,
  }).select("id").single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, id: data.id });
}
