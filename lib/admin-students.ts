import { createAdminClient } from "@/lib/supabase/server";

type AdminClient = ReturnType<typeof createAdminClient>;

export interface CreateStudentInput {
  name: string;
  email: string;
  password: string;
  courseId?: string | null;
}

export interface CreateStudentResult {
  ok: boolean;
  id?: string;
  error?: string;
}

/**
 * Creates one student: auth user + public.users row + course access + AI credits.
 * Rolls back the auth user if the profile insert fails, so retries don't leave
 * an orphaned auth account with no matching row in public.users.
 */
export async function createStudent(
  adminSupabase: AdminClient,
  { name, email, password, courseId }: CreateStudentInput
): Promise<CreateStudentResult> {
  if (!name || !email || !password) {
    return { ok: false, error: "שדות חסרים" };
  }

  const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name, role: "student" },
  });

  if (authError || !authData.user) {
    return { ok: false, error: authError?.message ?? "שגיאה ביצירת משתמש" };
  }

  const userId = authData.user.id;

  const { error: profileError } = await adminSupabase
    .from("users")
    .insert({ id: userId, name, role: "student" });

  if (profileError) {
    await adminSupabase.auth.admin.deleteUser(userId);
    return { ok: false, error: "שגיאה בשמירת פרטי חניך" };
  }

  if (courseId) {
    await adminSupabase.from("user_course_access").insert({ user_id: userId, course_id: courseId });
  }

  await adminSupabase.from("ai_credits").insert({ user_id: userId, monthly_limit: 30, current_month_usage: 0 });

  return { ok: true, id: userId };
}
