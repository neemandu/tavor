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
    name?: string;
    student_description?: string | null;
    student_role?: string | null;
    ai_instructions?: string | null;
    voice_instructions?: string | null;
    difficulty?: string | null;
    category?: string | null;
    hints?: string[] | null;
  };

  const supabase = createAdminClient();
  const { error } = await supabase.from("scenarios").update(body).eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
