import { createClient, createAdminClient } from "@/lib/supabase/server";
import { streamScenarioChat } from "@/lib/claude";
import { NextRequest } from "next/server";
import type { ChatMessage } from "@/types";

const enc = new TextEncoder();
function sse(obj: unknown) {
  return enc.encode(`data: ${JSON.stringify(obj)}\n\n`);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response(JSON.stringify({ error: "לא מחובר" }), { status: 401 });

  const { messages, description, sessionId, sessionType } = await request.json() as {
    messages: ChatMessage[];
    description?: string;
    sessionId: string | null;
    sessionType: "free_practice" | "free_conversation";
  };

  const adminSupabase = createAdminClient();

  const { data: credits } = await adminSupabase
    .from("ai_credits")
    .select("monthly_limit, current_month_usage")
    .eq("user_id", user.id)
    .maybeSingle();

  if (credits && credits.current_month_usage >= credits.monthly_limit) {
    return new Response(JSON.stringify({ error: "הגעת למכסת השיחות החודשית" }), { status: 429 });
  }

  const dialectBase = `אתה ערבי מעזה (عامية غزاوية). דבר ערבית עזתית-פלסטינית בלבד — אל תעבור לעברית, לאנגלית, או לערבית ספרותית. השב בקצרה וטבעי, כמו שיחה אמיתית. אם בן שיחתך לא מבין, חזור בניסוח פשוט יותר אך תישאר בערבית.`;
  const systemPrompt = sessionType === "free_practice"
    ? `${dialectBase} הסיטואציה: ${description ?? "שיחה יומיומית"}. פתח את השיחה באופן טבעי בהתאם לסיטואציה.`
    : `${dialectBase} נהל שיחה יומיומית חופשית וידידותית. שאל שאלות, הגב בצורה אנושית וטבעית.`;

  if (!process.env.ANTHROPIC_API_KEY) {
    const stub = "مرحباً!";
    return new Response(
      new ReadableStream({ start(c) { c.enqueue(sse({ text: stub })); c.enqueue(sse({ done: true, sessionId })); c.close(); } }),
      { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" } }
    );
  }

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const claudeStream = await streamScenarioChat(messages, systemPrompt);
        let fullText = "";

        for await (const chunk of claudeStream) {
          if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") {
            fullText += chunk.delta.text;
            controller.enqueue(sse({ text: chunk.delta.text }));
          }
        }

        const finalMsg = await claudeStream.finalMessage();
        const tokensUsed = finalMsg.usage.input_tokens + finalMsg.usage.output_tokens;
        const newMessages: ChatMessage[] = [...messages, { role: "assistant", content: fullText }];

        let currentSessionId = sessionId;
        if (!currentSessionId) {
          const { data: newSession } = await adminSupabase
            .from("ai_sessions")
            .insert({ user_id: user.id, scenario_id: null, session_type: sessionType, messages: newMessages, tokens_used: tokensUsed })
            .select("id").single();
          currentSessionId = newSession?.id ?? null;
        } else {
          await adminSupabase.from("ai_sessions")
            .update({ messages: newMessages, tokens_used: tokensUsed })
            .eq("id", currentSessionId);
        }

        if (credits) {
          await adminSupabase.from("ai_credits")
            .update({ current_month_usage: credits.current_month_usage + 1 })
            .eq("user_id", user.id);
        }

        controller.enqueue(sse({ done: true, sessionId: currentSessionId }));
      } catch (err) {
        console.error("Claude API error:", err);
        controller.enqueue(sse({ error: "שגיאה בשיחה עם AI" }));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "X-Accel-Buffering": "no",
    },
  });
}
