export const maxDuration = 60;

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { generateFeedback } from "@/lib/claude";
import { awardPoints } from "@/lib/award-points";
import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import type { ChatMessage } from "@/types";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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
    let feedbackText = "";
    let tokens = 0;

    if (scenarioId) {
      const { data: scenario } = await adminSupabase
        .from("scenarios")
        .select("*")
        .eq("id", scenarioId)
        .single();

      if (scenario) {
        const result = await generateFeedback(messages, scenario);
        feedbackText = result.text;
        tokens = result.tokens;
        await awardPoints(userId, 10, "scenario_complete", { scenario_id: scenarioId });
      }
    } else {
      const conversation = messages
        .map((m) => `${m.role === "user" ? "חניך" : "AI"}: ${m.content}`)
        .join("\n");

      const feedbackPrompt = `נתח את השיחה הבאה בערבית. תן פידבק בעברית:

השיחה:
${conversation}

תן פידבק מובנה עם כותרות ברורות:

## חוזקות
מה החניך עשה טוב בשיחה

## נקודות לשיפור
מה צריך שיפור ואיך

## הערות דקדוקיות
טעויות ספציפיות בדקדוק, מבנה משפט או בחירת מילים (ציין את הצורה הנכונה)

## המלצות לתרגול
על מה להתמקד בפעם הבאה

היה ספציפי ומעודד.`;

      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 2048,
        system: "אתה מורה לערבית. כתוב את כל התשובות שלך בעברית בלבד, ללא יוצא מן הכלל.",
        messages: [{ role: "user", content: feedbackPrompt }],
      });

      feedbackText = response.content[0].type === "text" ? response.content[0].text : "";
      tokens = response.usage.input_tokens + response.usage.output_tokens;
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
