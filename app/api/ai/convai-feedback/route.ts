export const maxDuration = 60;

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { generateFeedback } from "@/lib/claude";
import { loadAiConfig } from "@/lib/ai-config";
import { awardPoints } from "@/lib/award-points";
import { NextRequest, NextResponse } from "next/server";
import type { ChatMessage } from "@/types";

async function fetchTranscript(conversationId: string): Promise<ChatMessage[]> {
  for (let attempt = 0; attempt < 5; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 2000));
    const res = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversations/${conversationId}`,
      { headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY! } }
    );
    if (!res.ok) throw new Error("Failed to fetch transcript");
    const data = await res.json();
    const messages = (data.transcript ?? []).map((t: { role: string; message: string }) => ({
      role: t.role === "agent" ? "assistant" : "user",
      content: t.message,
    }));
    if (messages.length > 0) return messages;
  }
  return [];
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  const userId = session.user.id;

  const { conversationId, scenarioId, sessionType } = await request.json() as {
    conversationId: string;
    scenarioId?: string;
    sessionType: string;
  };

  const messages = await fetchTranscript(conversationId);
  if (messages.length === 0) return NextResponse.json({ feedback: "" });

  const adminSupabase = createAdminClient();

  try {
    const cfg = await loadAiConfig();
    let feedbackText = "";
    let tokens = 0;

    if (scenarioId) {
      const { data: scenario } = await adminSupabase
        .from("scenarios")
        .select("*")
        .eq("id", scenarioId)
        .single();

      if (scenario) {
        const result = await generateFeedback(messages, cfg.feedback, scenario.name);
        feedbackText = result.text;
        tokens = result.tokens;
        await awardPoints(userId, 10, "scenario_complete", { scenario_id: scenarioId });
      }
    } else {
      const result = await generateFeedback(messages, cfg.feedback);
      feedbackText = result.text;
      tokens = result.tokens;
    }

    await adminSupabase.from("ai_sessions").insert({
      user_id: userId,
      scenario_id: scenarioId ?? null,
      session_type: sessionType,
      messages,
      tokens_used: tokens,
      feedback_text: feedbackText,
      ended_at: new Date().toISOString(),
    });

    return NextResponse.json({ feedback: feedbackText });
  } catch (err) {
    console.error("convai-feedback error:", err);
    return NextResponse.json({ error: "שגיאה ביצירת פידבק" }, { status: 500 });
  }
}
