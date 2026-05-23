import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// Cached voice ID fetched from ElevenLabs account (resets on server restart)
let cachedVoiceId: string | null = null;

async function resolveVoiceId(apiKey: string): Promise<string | null> {
  if (cachedVoiceId) return cachedVoiceId;

  try {
    const res = await fetch("https://api.elevenlabs.io/v1/voices", {
      headers: { "xi-api-key": apiKey },
    });
    if (!res.ok) return null;
    const data = await res.json() as { voices: Array<{ voice_id: string; name: string }> };
    const voice = data.voices?.[0];
    if (!voice) return null;
    cachedVoiceId = voice.voice_id;
    console.log(`ElevenLabs: using voice "${voice.name}" (${voice.voice_id})`);
    return cachedVoiceId;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "TTS לא מוגדר – הוסף ELEVENLABS_API_KEY" }, { status: 503 });
  }

  const { text } = await request.json() as { text: string; lang?: string };
  if (!text?.trim()) return NextResponse.json({ error: "טקסט חסר" }, { status: 400 });

  // Strip emojis that TTS narrates in English
  const cleanText = text.replace(/\p{Emoji_Presentation}/gu, "").replace(/\p{Emoji}️/gu, "").trim();
  if (!cleanText) return NextResponse.json({ error: "טקסט ריק" }, { status: 400 });

  // Use env-configured voice ID or auto-detect first available voice
  const voiceId = process.env.ELEVENLABS_VOICE_AR ?? await resolveVoiceId(apiKey);
  if (!voiceId) {
    return NextResponse.json({ error: "לא נמצאו קולות ב-ElevenLabs" }, { status: 503 });
  }

  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: cleanText,
        model_id: "eleven_multilingual_v2",
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
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
