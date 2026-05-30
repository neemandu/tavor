import { createClient, createAdminClient } from "@/lib/supabase/server"; // adminClient needed for scenario fetch (bypasses RLS)
import { streamScenarioChat, buildScenarioSystemPrompt } from "@/lib/claude";
import { loadAiConfig } from "@/lib/ai-config";
import { NextRequest } from "next/server";
import type { ChatMessage } from "@/types";

const enc = new TextEncoder();
function sse(obj: unknown) {
  return enc.encode(`data: ${JSON.stringify(obj)}\n\n`);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return new Response(JSON.stringify({ error: "לא מחובר" }), { status: 401 });

  const { messages, scenarioId } = await request.json() as {
    messages: ChatMessage[];
    scenarioId: string;
  };

  const adminSupabase = createAdminClient();

  const { data: scenario } = await adminSupabase
    .from("scenarios").select("*").eq("id", scenarioId).single();

  if (!scenario) return new Response(JSON.stringify({ error: "תרחיש לא נמצא" }), { status: 404 });

  const cfg = await loadAiConfig();
  const systemPrompt = buildScenarioSystemPrompt(scenario, cfg.persona);

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
        let fullText = "";

        for await (const chunk of claudeStream) {
          if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") {
            fullText += chunk.delta.text;
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
