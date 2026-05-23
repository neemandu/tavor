import Anthropic from "@anthropic-ai/sdk";
import type { ChatMessage, Scenario } from "@/types";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export function buildScenarioSystemPrompt(scenario: Scenario): string {
  const hints = scenario.hints?.map((h, i) => `${i + 1}. ${h}`).join("\n") ?? "";

  return `אתה משחק תפקיד בשיחה לצורכי לימוד שפה ערבית.

הנחיות לתפקיד:
${scenario.ai_instructions ?? ""}

כללים:
- דבר תמיד בערבית עזתית-פלסטינית (عامية غزاوية) — ניב עזה/רצועת עזה
- הישאר בתפקיד לאורך כל השיחה
- השיב בצורה קצרה וטבעית כפי שהדמות הייתה עושה
- אל תתקן את החניך מיד; המשך את השיחה בצורה טבעית
- פתח את השיחה בהתאם לתרחיש
- התשובות שלך יוקראו בקול על ידי סוכן קולי – כתוב משפטים מדוברים וטבעיים, ללא סימני פיסוק מיוחדים, רשימות או כותרות
${scenario.voice_instructions ? `\nהנחיות לסוכן הקולי:\n${scenario.voice_instructions}` : ""}

פרטי התרחיש:
שם: ${scenario.name}
תפקיד החניך: ${scenario.student_role ?? "חייל"}
${hints ? `הכוונות (לידיעתך בלבד):\n${hints}` : ""}`;
}

export function buildFeedbackPrompt(
  messages: ChatMessage[],
  scenario: Scenario
): string {
  const conversation = messages
    .map((m) => `${m.role === "user" ? "חניך" : "AI"}: ${m.content}`)
    .join("\n");

  return `אתה מורה לערבית מנוסה. בדוק את השיחה שהחניך ניהל בתרחיש "${scenario.name}" ותן פידבק מפורט בעברית.

השיחה:
${conversation}

תן פידבק מובנה עם כותרות ברורות:
## חוזקות
מה החניך עשה טוב בשיחה

## חולשות
מה צריך שיפור ואיך

## הערות דקדוק
טעויות ספציפיות בדקדוק, מבנה משפט או בחירת מילים (ציין את הצורה הנכונה)

## המלצות לתרגול
על מה להתמקד בפעם הבאה`;
}

export async function streamScenarioChat(
  messages: ChatMessage[],
  systemPrompt: string
) {
  return anthropic.messages.stream({
    model: "claude-sonnet-4-6",
    max_tokens: 512,
    system: systemPrompt,
    messages: messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
  });
}

export async function generateFeedback(
  messages: ChatMessage[],
  scenario: Scenario
): Promise<{ text: string; tokens: number }> {
  const prompt = buildFeedbackPrompt(messages, scenario);

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    messages: [{ role: "user", content: prompt }],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";
  const tokens = response.usage.input_tokens + response.usage.output_tokens;

  return { text, tokens };
}
