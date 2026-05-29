import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { awardPoints } from "@/lib/award-points";

export async function POST(request: NextRequest) {
  // Auth check
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  }

  // Parse body
  const body = await request.json().catch(() => ({}));
  const { letter } = body as { letter?: string };

  if (!letter || typeof letter !== "string") {
    return NextResponse.json({ error: "שדה letter נדרש" }, { status: 400 });
  }

  const adminSupabase = createAdminClient();

  // Upsert letter progress
  const { error: progressError } = await adminSupabase
    .from("letter_progress")
    .upsert(
      {
        user_id: user.id,
        letter,
        completed_at: new Date().toISOString(),
      },
      { onConflict: "user_id,letter" }
    );

  if (progressError) {
    console.error("letter_progress upsert error:", progressError);
    return NextResponse.json({ error: "שגיאה בשמירת התקדמות" }, { status: 500 });
  }

  // Award points + update streak + evaluate achievements (centralized).
  await awardPoints(user.id, 2, "letter_learned", { letter });

  return NextResponse.json({ ok: true });
}
