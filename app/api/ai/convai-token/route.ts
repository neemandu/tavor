import { createClient, createAdminClient } from "@/lib/supabase/server";
import {
  buildKhalidScenarioPrompt,
  buildKhalidFreePracticePrompt,
  buildKhalidFreeConversationPrompt,
} from "@/lib/khalid-character";
import { loadAiConfig } from "@/lib/ai-config";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

  const { scenarioId, description, sessionType } = await request.json() as {
    scenarioId?: string;
    description?: string;
    sessionType: string;
  };

  const agentId = process.env.ELEVENLABS_AGENT_ID;
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!agentId || !apiKey) {
    return NextResponse.json({ error: "ElevenLabs agent not configured" }, { status: 500 });
  }

  const cfg = await loadAiConfig();
  let systemPrompt = buildKhalidFreeConversationPrompt(cfg.persona, cfg.freeConversation);

  if (scenarioId) {
    const adminSupabase = createAdminClient();
    const { data: scenario } = await adminSupabase
      .from("scenarios")
      .select("*")
      .eq("id", scenarioId)
      .single();
    if (!scenario) return NextResponse.json({ error: "תרחיש לא נמצא" }, { status: 404 });
    const hints = (scenario.hints as string[] | null) ?? [];
    systemPrompt = buildKhalidScenarioPrompt(
      cfg.persona,
      scenario.ai_instructions ?? "",
      scenario.name,
      scenario.student_role ?? "",
      hints,
      scenario.voice_instructions ?? undefined
    );
  } else if (description) {
    systemPrompt = buildKhalidFreePracticePrompt(cfg.persona, cfg.freePractice, description);
  }

  const res = await fetch(
    `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${agentId}`,
    { headers: { "xi-api-key": apiKey } }
  );

  if (!res.ok) {
    const err = await res.text();
    console.error("ElevenLabs signed URL error:", err);
    return NextResponse.json({ error: "שגיאה ב-ElevenLabs" }, { status: 500 });
  }

  const { signed_url } = await res.json();
  // System prompt is returned to client and applied as an override in the WebSocket handshake
  return NextResponse.json({ signedUrl: signed_url, systemPrompt, sessionType });
}
