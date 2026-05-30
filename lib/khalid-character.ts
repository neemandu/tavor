// Voice-agent prompt builders. The persona and free-mode behavior text now come
// from the editable AI config (lib/ai-config.ts → app_config); the dynamic
// scaffolding (scenario data, situation, hints) stays here as fixed code.

export function buildKhalidScenarioPrompt(
  persona: string,
  scenarioInstructions: string,
  scenarioName: string,
  studentRole: string,
  hints: string[],
  voiceInstructions?: string
): string {
  const hintText = hints.length > 0
    ? `\nBackground hints (for your awareness only):\n${hints.map((h, i) => `${i + 1}. ${h}`).join("\n")}`
    : "";

  return `${persona}

SCENARIO: ${scenarioName}
The student's role: ${studentRole || "soldier"}

Role instructions:
${scenarioInstructions}
${hintText}
${voiceInstructions ? `\nVoice agent notes:\n${voiceInstructions}` : ""}

Open the conversation naturally according to the scenario. Stay in character. Max 15 words per reply in Gazan Arabic.`;
}

export function buildKhalidFreePracticePrompt(
  persona: string,
  freePracticeText: string,
  description: string
): string {
  return `${persona}

SITUATION: ${description}

${freePracticeText}`;
}

export function buildKhalidFreeConversationPrompt(
  persona: string,
  freeConversationText: string
): string {
  return `${persona}

${freeConversationText}`;
}
