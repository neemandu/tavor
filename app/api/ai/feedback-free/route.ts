import { createClient, createAdminClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import type { ChatMessage } from "@/types";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  const userId = session.user.id;

  const { messages, sessionType } = (await request.json()) as {
    messages: ChatMessage[];
    sessionType: string;
  };

  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({
        feedback:
          "פידבק AI אינו זמין בסביבה זו. הגדר ANTHROPIC_API_KEY להפעלת הפידבק.",
      });
    }

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

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";
    const tokens =
      response.usage.input_tokens + response.usage.output_tokens;

    const adminSupabase = createAdminClient();
    await adminSupabase.from("ai_sessions").insert({
      user_id: userId,
      scenario_id: null,
      session_type: sessionType ?? "free_conversation",
      messages,
      tokens_used: tokens,
      feedback_text: text,
      ended_at: new Date().toISOString(),
    });

    return NextResponse.json({ feedback: text });
  } catch (err) {
    console.error("Feedback generation error:", err);
    return NextResponse.json({ error: "שגיאה ביצירת פידבק" }, { status: 500 });
  }
}
