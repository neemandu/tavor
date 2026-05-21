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
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });

  const { id } = await params;
  const body = await request.json() as {
    arabic_text?: string;
    transliteration?: string | null;
    hebrew_translation?: string;
    category?: string | null;
    inflections?: Record<string, string> | null;
  };

  const supabase = createAdminClient();
  const { error } = await supabase.from("vocabulary").update(body).eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });

  const { id } = await params;
  const supabase = createAdminClient();

  const { data: word } = await supabase
    .from("vocabulary")
    .select("recording_path")
    .eq("id", id)
    .single();

  if (word?.recording_path) {
    await supabase.storage
      .from("vocabulary-recordings")
      .remove([word.recording_path]);
  }

  const { error } = await supabase.from("vocabulary").delete().eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
