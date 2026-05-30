import { createClient, createAdminClient } from "@/lib/supabase/server";
import { generateFeedback } from "@/lib/claude";
import { loadAiConfig } from "@/lib/ai-config";
import { awardPoints } from "@/lib/award-points";
import { NextRequest, NextResponse } from "next/server";
import type { ChatMessage } from "@/types";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  const userId = session.user.id;

  const { messages, scenarioId } = await request.json() as {
    messages: ChatMessage[];
    scenarioId: string;
  };

  const adminSupabase = createAdminClient();

  const { data: scenario } = await adminSupabase
    .from("scenarios")
    .select("*")
    .eq("id", scenarioId)
    .single();

  if (!scenario) {
    return NextResponse.json({ error: "תרחיש לא נמצא" }, { status: 404 });
  }

  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({
        feedback: "פידבק AI אינו זמין בסביבה זו. הגדר ANTHROPIC_API_KEY להפעלת הפידבק.",
      });
    }

    const cfg = await loadAiConfig();
    const { text, tokens } = await generateFeedback(messages, cfg.feedback, scenario.name);
    const now = new Date().toISOString();

    await adminSupabase.from("ai_sessions").insert({
      user_id: userId,
      scenario_id: scenarioId,
      session_type: "scenario",
      messages,
      tokens_used: tokens,
      feedback_text: text,
      ended_at: now,
    });

    await awardPoints(userId, 10, "scenario_complete", { scenario_id: scenarioId });

    return NextResponse.json({ feedback: text });
  } catch (err) {
    console.error("Feedback generation error:", err);
    return NextResponse.json({ error: "שגיאה ביצירת פידבק" }, { status: 500 });
  }
}
