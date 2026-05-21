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
    name: string;
    student_description?: string | null;
    student_role?: string | null;
    ai_instructions?: string | null;
    voice_instructions?: string | null;
    hints?: string[] | null;
    difficulty?: string | null;
    category?: string | null;
  };

  if (!body.name?.trim()) {
    return NextResponse.json({ error: "שם התרחיש נדרש" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase.from("scenarios").insert({
    ...body,
    created_by: user.id,
  }).select("id").single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, id: data.id });
}
