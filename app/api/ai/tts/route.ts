import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// Default voices – override via env vars for custom voice clones
const VOICE_AR = process.env.ELEVENLABS_VOICE_AR ?? "pNInz6obpgDQGcFmaJgB"; // Adam – multilingual
const VOICE_HE = process.env.ELEVENLABS_VOICE_HE ?? "21m00Tcm4TlvDq8ikWAM"; // Rachel – multilingual

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

  if (!process.env.ELEVENLABS_API_KEY) {
    return NextResponse.json({ error: "TTS לא מוגדר – הוסף ELEVENLABS_API_KEY" }, { status: 503 });
  }

  const { text, lang } = await request.json() as { text: string; lang?: string };
  if (!text?.trim()) return NextResponse.json({ error: "טקסט חסר" }, { status: 400 });

  // Strip emojis and special characters that TTS narrates in English
  const cleanText = text.replace(/\p{Emoji_Presentation}/gu, "").replace(/\p{Emoji}️/gu, "").trim();
  if (!cleanText) return NextResponse.json({ error: "טקסט ריק לאחר ניקוי" }, { status: 400 });

  const voiceId = lang === "he" ? VOICE_HE : VOICE_AR;

  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": process.env.ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: cleanText,
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      }),
    }
  );

  if (!response.ok) {
    const err = await response.text();
    console.error("ElevenLabs TTS error:", response.status, err);
    return NextResponse.json({ error: "שגיאת TTS", detail: err }, { status: response.status });
  }

  const audioData = await response.arrayBuffer();
  return new NextResponse(audioData, {
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "no-store",
    },
  });
}
