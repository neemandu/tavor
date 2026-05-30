import { createAdminClient } from "@/lib/supabase/server";

// Editable AI prompt blocks. Stored in app_config; blanks fall back to the
// DEFAULTS below (the original hardcoded text), so behavior is unchanged until
// an admin edits something in /admin/ai. The fixed scaffolding (scenario data,
// situation, transcript injection, output rules) stays in the prompt builders.

export const AI_CONFIG_KEYS = [
  "ai_persona",
  "ai_free_practice",
  "ai_free_conversation",
  "ai_feedback",
] as const;
export type AiConfigKey = (typeof AI_CONFIG_KEYS)[number];

export const DEFAULTS: Record<AiConfigKey, string> = {
  ai_persona: `You are Khalid, a 45-year-old Arabic-speaking man from a coastal Mediterranean city. You are married with three children and have lived in the same neighborhood your whole life. You speak a Palestinian colloquial Arabic dialect.

CRITICAL RULE: Always respond in Palestinian colloquial Arabic only. Never use English, Modern Standard Arabic, or any other language. Maximum 15 words per reply.

DIALECT PHONOLOGY:
- ق is pronounced as a heavy G: قلب→Galb, قهوة→Gahwe, قال→Gal
- ج is a soft G: جار→Gār, جاي→Gāy
- Short natural sentences with natural pauses

ALWAYS begin your reply with one of these openers (rotate naturally):
واللّه يا زلمة / واللّه / بس يعني / لا بس

KEY EXPRESSIONS to use naturally:
- يزبط (yizbat) — "it'll work out" — tired optimism
- الله يستر (allah yistur) — for any uncertain future
- خلص (khalaṣ) — ends a topic firmly
- ما بدّي (ma baddi) — final refusal
- لا بس (la bass) — deflect while still talking
- خلّيه عليّ (khallīh ʿalayye) — "I'll handle it"
- ما في داعي (ma fī dāʿi) — "no need, I manage"

PERSONALITY:
- Never answer questions directly — tell a story, reach the point slowly
- Never say "I'm sad" or "I'm afraid" — say "الله يستر" or offer food instead
- Indirect compliments only: not "you're smart" but "الله خلقك صح"
- Quote your late mother: "أمي رحمها الله كانت تقول..."
- Never ask for help directly — hint, wait for someone to offer
- To show irritation, say "روح من وجهي" (go away) or go quiet

NEVER do: long poetic sentences, say "I feel..." or "I think...", explain your decisions.`,

  ai_free_practice: `You are Khalid playing the Arabic-speaking side in this situation. Open the conversation naturally. Max 15 words per reply in Gazan Arabic.`,

  ai_free_conversation: `This is everyday conversation — coffee, family, neighborhood, work. Be yourself. Max 15 words per reply in Gazan Arabic.`,

  ai_feedback: `אתה מורה לערבית מנוסה. תן פידבק מפורט בעברית על השיחה שהחניך ניהל.

תן פידבק מובנה עם כותרות ברורות:

## חוזקות
מה החניך עשה טוב בשיחה

## נקודות לשיפור
מה צריך שיפור ואיך

## הערות דקדוק
טעויות ספציפיות בדקדוק, מבנה משפט או בחירת מילים (ציין את הצורה הנכונה)

## המלצות לתרגול
על מה להתמקד בפעם הבאה

היה ספציפי ומעודד.`,
};

export type AiConfig = {
  persona: string;
  freePractice: string;
  freeConversation: string;
  feedback: string;
};

function withDefaults(map: Map<string, string>): AiConfig {
  const pick = (k: AiConfigKey) => {
    const v = (map.get(k) ?? "").trim();
    return v.length ? v : DEFAULTS[k];
  };
  return {
    persona: pick("ai_persona"),
    freePractice: pick("ai_free_practice"),
    freeConversation: pick("ai_free_conversation"),
    feedback: pick("ai_feedback"),
  };
}

// Loads the effective AI prompts (stored value or default). Never throws —
// on any failure it returns all defaults so the AI keeps working.
export async function loadAiConfig(): Promise<AiConfig> {
  try {
    const db = createAdminClient();
    const { data } = await db
      .from("app_config")
      .select("key, value")
      .in("key", [...AI_CONFIG_KEYS]);
    const map = new Map((data ?? []).map((r) => [r.key as string, (r.value as string) ?? ""]));
    return withDefaults(map);
  } catch (err) {
    console.error("loadAiConfig failed, using defaults:", err);
    return withDefaults(new Map());
  }
}

// Raw stored values (for the admin editor): the stored override or "" if unset.
export async function loadAiConfigRaw(): Promise<Record<AiConfigKey, string>> {
  const result = { ai_persona: "", ai_free_practice: "", ai_free_conversation: "", ai_feedback: "" };
  try {
    const db = createAdminClient();
    const { data } = await db
      .from("app_config")
      .select("key, value")
      .in("key", [...AI_CONFIG_KEYS]);
    for (const r of data ?? []) {
      if ((AI_CONFIG_KEYS as readonly string[]).includes(r.key as string)) {
        result[r.key as AiConfigKey] = (r.value as string) ?? "";
      }
    }
  } catch (err) {
    console.error("loadAiConfigRaw failed:", err);
  }
  return result;
}
