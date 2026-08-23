import { createAdminClient } from "@/lib/supabase/server";
import { createStudent } from "@/lib/admin-students";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const { name, email, password, courseId } = await request.json();

  const adminSupabase = createAdminClient();
  const result = await createStudent(adminSupabase, { name, email, password, courseId });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ id: result.id });
}
