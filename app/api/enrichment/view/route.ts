import { createClient } from "@/lib/supabase/server";
import { awardPoints } from "@/lib/award-points";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  }

  const { enrichmentId } = (await request.json()) as { enrichmentId: string };
  if (!enrichmentId) {
    return NextResponse.json({ error: "enrichmentId נדרש" }, { status: 400 });
  }

  // Award points + update streak + evaluate achievements (centralized).
  await awardPoints(user.id, 3, "enrichment_view", { enrichmentId });

  return NextResponse.json({ ok: true });
}
