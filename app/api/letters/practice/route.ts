import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { awardPoints } from "@/lib/award-points";
import { MASTERY_THRESHOLD } from "@/lib/letter-exercises";

type Result = { letter: string; correct: number; attempts: number };

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const results = (body.results as Result[] | undefined) ?? [];
  const clean = results.filter(
    (r) => r && typeof r.letter === "string" && (r.correct > 0 || r.attempts > 0)
  );
  if (clean.length === 0) {
    return NextResponse.json({ newlyMastered: [] });
  }

  const adminSupabase = createAdminClient();
  const letters = clean.map((r) => r.letter);

  // Read existing counts + which letters are already mastered.
  const [{ data: existingRows }, { data: masteredRows }] = await Promise.all([
    adminSupabase
      .from("letter_practice")
      .select("letter, correct_count, attempt_count")
      .eq("user_id", user.id)
      .in("letter", letters),
    adminSupabase
      .from("letter_progress")
      .select("letter")
      .eq("user_id", user.id)
      .in("letter", letters),
  ]);

  const existing = new Map(
    (existingRows ?? []).map((r) => [
      r.letter as string,
      { correct: (r.correct_count as number) ?? 0, attempts: (r.attempt_count as number) ?? 0 },
    ])
  );
  const alreadyMastered = new Set((masteredRows ?? []).map((r) => r.letter as string));

  const nowIso = new Date().toISOString();
  const upserts = clean.map((r) => {
    const prev = existing.get(r.letter) ?? { correct: 0, attempts: 0 };
    return {
      user_id: user.id,
      letter: r.letter,
      correct_count: prev.correct + Math.max(0, r.correct),
      attempt_count: prev.attempts + Math.max(0, r.attempts),
      last_practiced_at: nowIso,
    };
  });

  const { error: upsertErr } = await adminSupabase
    .from("letter_practice")
    .upsert(upserts, { onConflict: "user_id,letter" });
  if (upsertErr) {
    console.error("letter_practice upsert error:", upsertErr);
    return NextResponse.json({ error: "שגיאה בשמירת התקדמות" }, { status: 500 });
  }

  // Letters that just crossed the mastery threshold and aren't mastered yet.
  const newlyMastered = upserts
    .filter((u) => u.correct_count >= MASTERY_THRESHOLD && !alreadyMastered.has(u.letter))
    .map((u) => u.letter);

  for (const letter of newlyMastered) {
    const { error: progErr } = await adminSupabase
      .from("letter_progress")
      .upsert(
        { user_id: user.id, letter, completed_at: nowIso },
        { onConflict: "user_id,letter" }
      );
    if (progErr) {
      console.error("letter_progress upsert error:", progErr);
      continue;
    }
    // Award once per letter (points + streak + achievements pipeline).
    await awardPoints(user.id, 2, "letter_learned", { letter });
  }

  return NextResponse.json({ newlyMastered });
}
