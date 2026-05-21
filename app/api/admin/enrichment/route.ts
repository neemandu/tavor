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

export async function POST(request: NextRequest) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });

  const body = (await request.json()) as {
    title: string;
    url: string;
    description?: string;
    thumbnail_url?: string;
    category?: string;
  };

  if (!body.title?.trim()) {
    return NextResponse.json({ error: "כותרת נדרשת" }, { status: 400 });
  }
  if (!body.url?.trim()) {
    return NextResponse.json({ error: "קישור נדרש" }, { status: 400 });
  }

  const adminSupabase = createAdminClient();
  const { error } = await adminSupabase.from("enrichment").insert({
    title: body.title.trim(),
    url: body.url.trim(),
    description: body.description?.trim() || null,
    thumbnail_url: body.thumbnail_url?.trim() || null,
    category: body.category || null,
    is_active: true,
    created_by: user.id,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
