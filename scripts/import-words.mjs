// One-time loader for new_words_tavor.xlsx → the `vocabulary` table.
//
//   node scripts/import-words.mjs            # dry run: parse + map + print stats
//   node scripts/import-words.mjs --commit   # replace-all load into Supabase
//
// Requires migration 0004 applied first (the hebrew_phonetic / semantic_field /
// chapter columns must exist). Reads credentials from .env.local.
//
// NOTE: the category mapping mirrors lib/vocab-categories.ts. Node ESM can't
// import that TS module, so keep the two in sync.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { createClient } from "@supabase/supabase-js";

const require = createRequire(import.meta.url);
const XLSX = require("xlsx");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const FILE = path.join(ROOT, "new_words_tavor.xlsx");
const ZERO_UUID = "00000000-0000-0000-0000-000000000000";

// ---- category mapping (mirror of lib/vocab-categories.ts) -------------------
const RULES = [
  ["פעלים", ["פעל"]],
  ["שאלות", ["שאל"]],
  ["ביטויים ותגובות", ["ביטוי", "פתגם", "נימוס", "שבוע", "הצגה", "ברכ", "דיבור", "שיחה"]],
  ["זמן וכמות", ["זמן", "מספר", "כמות", "חשבון"]],
  ["מילות קישור ויחס", ["מילות", "כינוי", "תחביר", "שלילה", "קישור", "חיבור", "קניין", "קיום", "סיבה", "מטרה", "ניגוד", "תוספת"]],
  ["תיאורים ותארים", ["תיאור", "תאר", "הדגש"]],
  ["משפחה ואנשים", ["משפחה", "אנשים", "שמות", "מידע אישי", "זהות", "רגש"]],
  ["מקומות ותחבורה", ["מקום", "מקומות", "מבנ", "עיר", "ערים", "מדינ", "תחבורה", "כיוון", "תנוע", "דרכ", "חנות", "מסחר"]],
  ["חפצים ומזון", ["חפצ", "לבוש", "מזון", "משק", "רכב", "מדיה", "מכתב"]],
  ["ביטחון וצבא", ["ביטחון", "צבא", "דרג", "פקוד", "פשיע", "מחבל", "מורד", "פליט", "מוקפ", "עוצר", "פוליטיק", "מדיני", "דיפלומט", "אירוע"]],
  ["עבודה, מקצועות ומוסדות", ["עבוד", "מקצוע", "תפקיד", "מוסד", "שלטון"]],
  ["לימודים, דקדוק ומסמכים", ["בית ספר", "למיד", "לימוד", "דקדוק", "לשון", "שפה", "מסמכ", "מסמך", "תרבות"]],
  ["טבע, רפואה וגוף", ["טבע", "חיו", "חיות", "רפוא", "גוף"]],
];
const FALLBACK = "מושגים כלליים";

function matchRules(text) {
  for (const [cat, keywords] of RULES) {
    if (keywords.some((k) => text.includes(k))) return cat;
  }
  return null;
}

function mapSemanticField(raw) {
  if (!raw) return null;
  const s = String(raw).trim();
  if (!s || s.includes("ERROR")) return null;
  const first = s.split("/")[0].trim();
  return matchRules(first) ?? matchRules(s) ?? FALLBACK;
}

// ---- minimal .env.local loader ---------------------------------------------
function loadEnv() {
  const env = {};
  const text = fs.readFileSync(path.join(ROOT, ".env.local"), "utf8");
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) env[m[1]] = m[2].trim();
  }
  return env;
}

// ---- parse the workbook -----------------------------------------------------
function parseRows() {
  const wb = XLSX.readFile(FILE);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
  return rows
    .filter((r) => String(r.word).trim() && String(r.translation).trim())
    .map((r) => {
      const rawField = String(r.semantic_field ?? "").trim() || null;
      const chapterRaw = String(r.chapter ?? "").trim();
      return {
        hebrew_phonetic: String(r.word).trim(),
        hebrew_translation: String(r.translation).trim(),
        semantic_field: rawField,
        category: mapSemanticField(rawField),
        chapter: /^\d+$/.test(chapterRaw) ? parseInt(chapterRaw, 10) : null,
        created_by: null,
      };
    });
}

async function main() {
  const commit = process.argv.includes("--commit");
  const records = parseRows();

  // distribution report
  const dist = {};
  let uncategorized = 0;
  for (const r of records) {
    if (r.category) dist[r.category] = (dist[r.category] || 0) + 1;
    else uncategorized++;
  }
  console.log(`Parsed ${records.length} words.`);
  console.log("\nCategory distribution:");
  Object.entries(dist)
    .sort((a, b) => b[1] - a[1])
    .forEach(([k, v]) => console.log(`  ${String(v).padStart(4)}  ${k}`));
  console.log(`  ${String(uncategorized).padStart(4)}  (uncategorized / ERROR)`);

  if (!commit) {
    console.log("\nDry run — no data written. Re-run with --commit to load.");
    return;
  }

  const env = loadEnv();
  const supabase = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY
  );

  console.log("\nReplacing existing vocabulary…");
  const { error: delErr } = await supabase
    .from("vocabulary")
    .delete()
    .neq("id", ZERO_UUID);
  if (delErr) throw new Error(`delete failed: ${delErr.message}`);

  const BATCH = 500;
  let inserted = 0;
  for (let i = 0; i < records.length; i += BATCH) {
    const slice = records.slice(i, i + BATCH);
    const { error } = await supabase.from("vocabulary").insert(slice);
    if (error) throw new Error(`insert failed at ${i}: ${error.message}`);
    inserted += slice.length;
    console.log(`  inserted ${inserted}/${records.length}`);
  }
  console.log(`\nDone. ${inserted} words loaded.`);
}

main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
