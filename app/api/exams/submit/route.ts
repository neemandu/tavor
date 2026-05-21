import { createClient, createAdminClient } from "@/lib/supabase/server";
import { sendExamSubmissionEmail } from "@/lib/email";
import { awardPoints } from "@/lib/award-points";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const { examId } = await request.json();
  if (!examId) {
    return NextResponse.json({ error: "examId נדרש" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  }

  const adminSupabase = createAdminClient();

  // Check not already submitted
  const { data: existing } = await adminSupabase
    .from("exam_submissions")
    .select("id")
    .eq("exam_id", examId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: "כבר הגשת מבחן זה" }, { status: 409 });
  }

  // Fetch exam and student names for the email
  const [{ data: exam }, { data: profile }] = await Promise.all([
    adminSupabase.from("exams").select("name").eq("id", examId).single(),
    adminSupabase.from("users").select("name").eq("id", user.id).single(),
  ]);

  if (!exam || !profile) {
    return NextResponse.json({ error: "מבחן לא נמצא" }, { status: 404 });
  }

  const now = new Date();

  // Record submission
  const { error: insertError } = await adminSupabase
    .from("exam_submissions")
    .insert({ exam_id: examId, user_id: user.id, submitted_at: now.toISOString() });

  if (insertError) {
    return NextResponse.json({ error: "שגיאה בהגשה" }, { status: 500 });
  }

  // Send email (non-blocking — log errors but don't fail the request)
  let emailSent = false;
  try {
    await sendExamSubmissionEmail({
      studentName: profile.name,
      examName: exam.name,
      submittedAt: now,
    });
    emailSent = true;
    await adminSupabase
      .from("exam_submissions")
      .update({ email_sent_at: now.toISOString() })
      .eq("exam_id", examId)
      .eq("user_id", user.id);
  } catch (emailErr) {
    console.error("Failed to send submission email:", emailErr);
  }

  // Award 10 points for submitting an exam + update streak (fire-and-forget)
  awardPoints(user.id, 10, "exam_score", { exam_id: examId, type: "submission" }).catch(() => {});

  return NextResponse.json({ ok: true, emailSent });
}
