import type { VocabularyCategory } from "@/types";

// Maps the 233 raw `semantic_field` values from the source file into the broad
// VocabularyCategory buckets. Rules are tried in order; the first whose keyword
// appears (as a substring) wins. We classify by the FIRST "/"-segment first so
// compound fields like "בית ספר ולמידה / חשבון" follow their primary theme,
// then fall back to scanning the whole string, then to "מושגים כלליים".
//
// NOTE: scripts/import-words.mjs keeps a copy of this logic (Node ESM can't
// import this TS module). Keep the two in sync if the rules change.
const RULES: { cat: VocabularyCategory; keywords: string[] }[] = [
  { cat: "פעלים", keywords: ["פעל"] },
  { cat: "שאלות", keywords: ["שאל"] },
  {
    cat: "ביטויים ותגובות",
    keywords: ["ביטוי", "פתגם", "נימוס", "שבוע", "הצגה", "ברכ", "דיבור", "שיחה"],
  },
  { cat: "זמן וכמות", keywords: ["זמן", "מספר", "כמות", "חשבון"] },
  {
    cat: "מילות קישור ויחס",
    keywords: [
      "מילות", "כינוי", "תחביר", "שלילה", "קישור", "חיבור",
      "קניין", "קיום", "סיבה", "מטרה", "ניגוד", "תוספת",
    ],
  },
  { cat: "תיאורים ותארים", keywords: ["תיאור", "תאר", "הדגש"] },
  {
    cat: "משפחה ואנשים",
    keywords: ["משפחה", "אנשים", "שמות", "מידע אישי", "זהות", "רגש"],
  },
  {
    cat: "מקומות ותחבורה",
    keywords: [
      "מקום", "מקומות", "מבנ", "עיר", "ערים", "מדינ",
      "תחבורה", "כיוון", "תנוע", "דרכ", "חנות", "מסחר",
    ],
  },
  { cat: "חפצים ומזון", keywords: ["חפצ", "לבוש", "מזון", "משק", "רכב", "מדיה", "מכתב"] },
  {
    cat: "ביטחון וצבא",
    keywords: [
      "ביטחון", "צבא", "דרג", "פקוד", "פשיע", "מחבל", "מורד",
      "פליט", "מוקפ", "עוצר", "פוליטיק", "מדיני", "דיפלומט", "אירוע",
    ],
  },
  {
    cat: "עבודה, מקצועות ומוסדות",
    keywords: ["עבוד", "מקצוע", "תפקיד", "מוסד", "שלטון"],
  },
  {
    cat: "לימודים, דקדוק ומסמכים",
    keywords: [
      "בית ספר", "למיד", "לימוד", "דקדוק", "לשון", "שפה",
      "מסמכ", "מסמך", "תרבות",
    ],
  },
  { cat: "טבע, רפואה וגוף", keywords: ["טבע", "חיו", "חיות", "רפוא", "גוף"] },
];

const FALLBACK: VocabularyCategory = "מושגים כלליים";

function matchRules(text: string): VocabularyCategory | null {
  for (const { cat, keywords } of RULES) {
    if (keywords.some((k) => text.includes(k))) return cat;
  }
  return null;
}

/**
 * Collapse a raw semantic_field value into a broad VocabularyCategory.
 * Returns null for ERROR-flagged or empty values (left uncategorized).
 */
export function mapSemanticField(
  raw: string | null | undefined
): VocabularyCategory | null {
  if (!raw) return null;
  const s = raw.trim();
  if (!s || s.includes("ERROR")) return null;

  const firstSegment = s.split("/")[0].trim();
  return matchRules(firstSegment) ?? matchRules(s) ?? FALLBACK;
}
