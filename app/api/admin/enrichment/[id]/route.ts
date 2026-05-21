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
  const body = await request.json() as { is_active?: boolean; title?: string; description?: string; url?: string; thumbnail_url?: string; category?: string };

  const adminSupabase = createAdminClient();
  const { error } = await adminSupabase
    .from("enrichment")
    .update(body)
    .eq("id", id);

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
  const adminSupabase = createAdminClient();
  const { error } = await adminSupabase
    .from("enrichment")
    .delete()
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
