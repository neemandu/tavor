import { createClient, createAdminClient } from "@/lib/supabase/server";
import { generateFeedback } from "@/lib/claude";
import { NextRequest, NextResponse } from "next/server";
import type { ChatMessage } from "@/types";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  }

  const { messages, scenarioId, sessionId } = await request.json() as {
    messages: ChatMessage[];
    scenarioId: string;
    sessionId: string | null;
    userId: string;
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

    const { text, tokens } = await generateFeedback(messages, scenario);
    const now = new Date().toISOString();

    if (sessionId) {
      await adminSupabase
        .from("ai_sessions")
        .update({
          feedback_text: text,
          ended_at: now,
          tokens_used: tokens,
        })
        .eq("id", sessionId);
    }

    // Award 10 points for completing a scenario
    await adminSupabase.from("user_points").insert({
      user_id: user.id,
      points: 10,
      reason: "scenario_complete",
      metadata: { scenarioId },
    });

    return NextResponse.json({ feedback: text });
  } catch (err) {
    console.error("Feedback generation error:", err);
    return NextResponse.json({ error: "שגיאה ביצירת פידבק" }, { status: 500 });
  }
}
