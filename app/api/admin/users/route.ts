import { createAdminClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const { name, email, password, courseId } = await request.json();

  if (!name || !email || !password) {
    return NextResponse.json({ error: "שדות חסרים" }, { status: 400 });
  }

  const adminSupabase = createAdminClient();

  // Create auth user
  const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name, role: "student" },
  });

  if (authError || !authData.user) {
    const msg = authError?.message ?? "שגיאה ביצירת משתמש";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const userId = authData.user.id;

  // Insert into public.users
  const { error: profileError } = await adminSupabase
    .from("users")
    .insert({ id: userId, name, role: "student" });

  if (profileError) {
    // Rollback: delete auth user
    await adminSupabase.auth.admin.deleteUser(userId);
    return NextResponse.json({ error: "שגיאה בשמירת פרטי חניך" }, { status: 500 });
  }

  // Assign course if provided
  if (courseId) {
    await adminSupabase
      .from("user_course_access")
      .insert({ user_id: userId, course_id: courseId });
  }

  // Initialize AI credits
  await adminSupabase
    .from("ai_credits")
    .insert({ user_id: userId, monthly_limit: 30, current_month_usage: 0 });

  return NextResponse.json({ id: userId });
}
