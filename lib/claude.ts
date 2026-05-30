import Anthropic from "@anthropic-ai/sdk";
import type { ChatMessage, Scenario } from "@/types";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// `persona` comes from the editable AI config; scenario-specific data stays as
// fixed scaffolding here.
export function buildScenarioSystemPrompt(scenario: Scenario, persona: string): string {
  const hints = scenario.hints?.map((h, i) => `${i + 1}. ${h}`).join("\n") ?? "";

  return `${persona}

הנחיות לתפקיד בתרחיש:
${scenario.ai_instructions ?? ""}

פרטי התרחיש:
שם: ${scenario.name}
תפקיד החניך: ${scenario.student_role ?? "חייל"}
${hints ? `הכוונות (לידיעתך בלבד):\n${hints}` : ""}${scenario.voice_instructions ? `\n\nהנחיות לסוכן הקולי:\n${scenario.voice_instructions}` : ""}

ענה במשפט אחד קצר בלבד — עד 15 מילים בערבית עזתית-פלסטינית. הישאר בתפקיד ופתח את השיחה בהתאם לתרחיש.`;
}

// `feedbackGuidance` comes from the editable AI config; the transcript (and
// optional scenario name) are injected as fixed scaffolding.
export function buildFeedbackPrompt(
  messages: ChatMessage[],
  feedbackGuidance: string,
  scenarioName?: string
): string {
  const conversation = messages
    .map((m) => `${m.role === "user" ? "חניך" : "AI"}: ${m.content}`)
    .join("\n");
  const ctx = scenarioName ? `התרחיש: "${scenarioName}"\n\n` : "";

  return `${feedbackGuidance}

${ctx}השיחה:
${conversation}`;
}

export async function streamScenarioChat(
  messages: ChatMessage[],
  systemPrompt: string
) {
  return anthropic.messages.stream({
    model: "claude-haiku-4-5-20251001",
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
  feedbackGuidance: string,
  scenarioName?: string
): Promise<{ text: string; tokens: number }> {
  const prompt = buildFeedbackPrompt(messages, feedbackGuidance, scenarioName);

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    system: "אתה מורה לערבית. כתוב את כל התשובות שלך בעברית בלבד, ללא יוצא מן הכלל.",
    messages: [{ role: "user", content: prompt }],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";
  const tokens = response.usage.input_tokens + response.usage.output_tokens;

  return { text, tokens };
}
