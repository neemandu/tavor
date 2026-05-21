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

  const { name, type } = await request.json() as { name: string; type: string | null };
  if (!name?.trim()) return NextResponse.json({ error: "שם נדרש" }, { status: 400 });

  const supabase = createAdminClient();
  const { error } = await supabase.from("courses").insert({ name: name.trim(), type });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
