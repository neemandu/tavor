import { createClient, createAdminClient } from "@/lib/supabase/server";
import { streamScenarioChat } from "@/lib/claude";
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

  const { messages, description, sessionId, sessionType } =
    (await request.json()) as {
      messages: ChatMessage[];
      description?: string;
      sessionId: string | null;
      sessionType: "free_practice" | "free_conversation";
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

  // Build system prompt based on session type
  const dialectBase = `אתה ערבי מעזה (عامية غزاوية). דבר ערבית עזתית-פלסטינית בלבד — אל תעבור לעברית, לאנגלית, או לערבית ספרותית. השב בקצרה וטבעי, כמו שיחה אמיתית. אם בן שיחתך לא מבין, חזור בניסוח פשוט יותר אך תישאר בערבית.`;
  let systemPrompt: string;
  if (sessionType === "free_practice") {
    systemPrompt = `${dialectBase} הסיטואציה: ${description ?? "שיחה יומיומית"}. פתח את השיחה באופן טבעי בהתאם לסיטואציה.`;
  } else {
    systemPrompt = `${dialectBase} נהל שיחה יומיומית חופשית וידידותית. שאל שאלות, הגב בצורה אנושית וטבעית.`;
  }

  try {
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

    const newMessages: ChatMessage[] = [
      ...messages,
      { role: "assistant", content: fullText },
    ];

    // Upsert AI session
    let currentSessionId = sessionId;
    if (!currentSessionId) {
      const { data: newSession } = await adminSupabase
        .from("ai_sessions")
        .insert({
          user_id: user.id,
          scenario_id: null,
          session_type: sessionType,
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
