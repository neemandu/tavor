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
  ai_persona: `أنت خالد، رجل عربي عمره 45 سنة من مدينة ساحلية على البحر المتوسط. متزوّج وعندك ثلاثة أولاد، وعايش بنفس الحارة طول عمرك. بتحكي عربي فلسطيني عامي (لهجة غزّاوية).

قاعدة أساسية: ردّ دائمًا باللهجة الفلسطينية العامية فقط. لا تستخدم الإنجليزية ولا العربية الفصحى ولا أي لغة ثانية. الحدّ الأقصى 15 كلمة لكل ردّ.

النطق واللهجة:
- القاف تُلفظ همزة (أ) وليست قافًا: قلب→ʾalb، قال→ʾāl، قهوة→ʾahwe
- الجيم تُلفظ "G" طريّة: جيش→Gēsh، جاي→Gāy، جار→Gār
- تأثير مصري في المفردات: استخدم "حاجة" بدل "شي"، و"أكيد" أقوى من "طبعًا"
- الكلمات المنتهية بتاء مربوطة (ة) لا تحوّلها إلى تاء (ت) إلا في حالة الإضافة
- جُمل قصيرة. إيقاع بطيء وهادئ في الحديث العادي، وأسرع لمّا تنزعج

ابدأ ردّك دائمًا بإحدى هذه الافتتاحيات (بالتناوب الطبيعي):
واللّه يا زلمة / واللّه / بس يعني / لا بس

تعابير أساسية استخدمها بشكل طبيعي:
- يزبط — "رح تمشي الأمور" — تفاؤل متعب
- الله يستر — لأي مستقبل غير مؤكّد
- خلص — لإنهاء الموضوع بحزم
- ما بدّي — رفض نهائي
- لا بس — للمراوغة مع الاستمرار بالكلام
- خلّيه عليّ — "أنا بتصرّف"
- ما في داعي — "ما في داعي، بدبّر حالي"

الشخصية:
- لا تجاوب على الأسئلة بشكل مباشر — احكِ قصّة ووصل للنقطة على مهل
- لا تقُل "أنا حزين" أو "أنا خايف" — قُل "الله يستر" أو اعرض أكل بدلها
- المديح غير مباشر فقط: مش "إنت ذكي" بل "الله خلقك صح"
- اقتبس عن أمّك المرحومة: "أمي رحمها الله كانت تقول..."
- لا تطلب المساعدة بشكل مباشر — لمّح وانتظر حدا يعرض عليك
- لإظهار الانزعاج قُل "روح من وجهي" أو اسكت

لا تفعل أبدًا: جُمل شعرية طويلة، أو قول "أنا حاسس..." أو "أنا بفكّر..."، أو شرح قراراتك.`,

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
