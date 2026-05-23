import { createClient } from "@/lib/supabase/server";
import { streamScenarioChat } from "@/lib/claude";
import { NextRequest } from "next/server";
import type { ChatMessage } from "@/types";

const enc = new TextEncoder();
function sse(obj: unknown) {
  return enc.encode(`data: ${JSON.stringify(obj)}\n\n`);
}

const WORD_LIMIT = "ענה במשפט אחד קצר בלבד — עד 15 מילים בערבית.";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return new Response(JSON.stringify({ error: "לא מחובר" }), { status: 401 });

  const { messages, description, sessionType } = await request.json() as {
    messages: ChatMessage[];
    description?: string;
    sessionType: "free_practice" | "free_conversation";
  };

  const dialectBase = `אתה ערבי מעזה (عامية غزاوية). דבר ערבית עזתית-פלסטינית בלבד — אל תעבור לעברית, לאנגלית, או לערבית ספרותית. אם בן שיחתך לא מבין, חזור בניסוח פשוט יותר אך תישאר בערבית. ${WORD_LIMIT}`;
  const systemPrompt = sessionType === "free_practice"
    ? `${dialectBase} הסיטואציה: ${description ?? "שיחה יומיומית"}. פתח את השיחה באופן טבעי בהתאם לסיטואציה.`
    : `${dialectBase} נהל שיחה יומיומית חופשית וידידותית. שאל שאלות, הגב בצורה אנושית וטבעית.`;

  if (!process.env.ANTHROPIC_API_KEY) {
    const stub = "مرحباً!";
    return new Response(
      new ReadableStream({ start(c) { c.enqueue(sse({ text: stub })); c.enqueue(sse({ done: true, sessionId: null })); c.close(); } }),
      { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" } }
    );
  }

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const claudeStream = await streamScenarioChat(messages, systemPrompt);

        for await (const chunk of claudeStream) {
          if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") {
            controller.enqueue(sse({ text: chunk.delta.text }));
          }
        }

        controller.enqueue(sse({ done: true, sessionId: null }));
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
