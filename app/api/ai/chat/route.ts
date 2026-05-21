import { createClient, createAdminClient } from "@/lib/supabase/server";
import { streamScenarioChat, buildScenarioSystemPrompt } from "@/lib/claude";
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

  // Check AI credits
  const { data: credits } = await adminSupabase
    .from("ai_credits")
    .select("monthly_limit, current_month_usage")
    .eq("user_id", user.id)
    .maybeSingle();

  if (credits && credits.current_month_usage >= credits.monthly_limit) {
    return NextResponse.json(
      { error: "הגעת למכסת השיחות החודשית" },
      { status: 429 }
    );
  }

  // Fetch scenario
  const { data: scenario } = await adminSupabase
    .from("scenarios")
    .select("*")
    .eq("id", scenarioId)
    .single();

  if (!scenario) {
    return NextResponse.json({ error: "תרחיש לא נמצא" }, { status: 404 });
  }

  const systemPrompt = buildScenarioSystemPrompt(scenario);

  try {
    // Stub response when API key is not configured
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({
        text: "مرحباً! (שלום! — AI אינו מוגדר בסביבה זו. הגדר ANTHROPIC_API_KEY להפעלת השיחה.)",
        sessionId,
      });
    }

    const stream = await streamScenarioChat(messages, systemPrompt);
    let fullText = "";

    for await (const chunk of stream) {
      if (
        chunk.type === "content_block_delta" &&
        chunk.delta.type === "text_delta"
      ) {
        fullText += chunk.delta.text;
      }
    }

    const finalMessage = await stream.finalMessage();
    const tokensUsed =
      finalMessage.usage.input_tokens + finalMessage.usage.output_tokens;

    // Upsert AI session
    const newMessages: ChatMessage[] = [
      ...messages,
      { role: "assistant", content: fullText },
    ];

    let currentSessionId = sessionId;
    if (!currentSessionId) {
      const { data: newSession } = await adminSupabase
        .from("ai_sessions")
        .insert({
          user_id: user.id,
          scenario_id: scenarioId,
          session_type: "scenario",
          messages: newMessages,
          tokens_used: tokensUsed,
        })
        .select("id")
        .single();
      currentSessionId = newSession?.id ?? null;
    } else {
      await adminSupabase
        .from("ai_sessions")
        .update({ messages: newMessages, tokens_used: tokensUsed })
        .eq("id", currentSessionId);
    }

    // Increment credits usage
    if (credits) {
      await adminSupabase
        .from("ai_credits")
        .update({ current_month_usage: credits.current_month_usage + 1 })
        .eq("user_id", user.id);
    }

    return NextResponse.json({ text: fullText, sessionId: currentSessionId });
  } catch (err) {
    console.error("Claude API error:", err);
    return NextResponse.json({ error: "שגיאה בשיחה עם AI" }, { status: 500 });
  }
}
