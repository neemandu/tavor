# Vocabulary: switch to Hebrew-phonetic word format

**Date:** 2026-06-01
**Status:** Approved

## Problem

A new source file `new_words_tavor.xlsx` (1,275 rows) holds the course vocabulary in a
format the app does not currently support:

| Column | Meaning | Example |
|---|---|---|
| `word` | the Arabic word spelled **phonetically in Hebrew letters** (no Arabic script) | `זַ׳אבֵט` (ضابط = officer) |
| `translation` | Hebrew meaning | `קצין` |
| `chapter` | course chapter number (1–24) | `1` |
| `semantic_field` | category — **233 distinct free-text Hebrew values**, ~24 literally `"ERROR"` | `מקצועות` |

The current `vocabulary` model is Arabic-script-centric: `arabic_text` is `NOT NULL` and
rendered in an Arabic font; `category` is a fixed 5-value enum. The directive is
**"change the app to fit this."**

## Decisions (confirmed with user)

1. **Word format:** Hebrew-phonetic only. The headline word becomes `hebrew_phonetic`,
   rendered RTL in the normal Hebrew font. `arabic_text` is kept as an optional/empty
   column for the future.
2. **Categories:** Group the 233 raw fields into ~14 broad buckets via a deterministic
   keyword mapper; keep the raw `semantic_field` per word too.
3. **Existing words:** Replace all — clear the current Arabic-script seed rows.
4. **Chapters:** Store `chapter` and expose a chapter filter.
5. **ERROR rows:** Import the word + translation, but leave `category` blank
   (uncategorized). Raw `semantic_field` kept verbatim.

## Architecture

### Migration `supabase/migrations/0004_vocabulary_format.sql` (idempotent)
- `ALTER TABLE vocabulary ALTER COLUMN arabic_text DROP NOT NULL`
- `ADD COLUMN IF NOT EXISTS hebrew_phonetic TEXT`
- `ADD COLUMN IF NOT EXISTS semantic_field TEXT`
- `ADD COLUMN IF NOT EXISTS chapter INT`
- Drop the old `category` CHECK constraint; add a new CHECK over the broad set below.
- Rebuild `vocabulary_search_idx` over `hebrew_phonetic + hebrew_translation + semantic_field`.
- Append the same blocks to `schema.sql` (source of truth, idempotent style).

### `lib/vocab-categories.ts`
- `BROAD_CATEGORIES`: ordered list of the 14 keys + Hebrew labels.
- `mapSemanticField(raw: string): VocabularyCategory | null` — splits on `/`, scans for
  keywords in priority order, returns the broad key; `ERROR`/unknown → `null`.

Broad categories (key = label, all Hebrew):
`פעלים`, `ביטויים ותגובות`, `שאלות`, `זמן וכמות`, `מילות קישור ויחס`,
`תיאורים ותארים`, `משפחה ואנשים`, `מקומות ותחבורה`, `חפצים ומזון`,
`ביטחון וצבא`, `עבודה, מקצועות ומוסדות`, `לימודים, דקדוק ומסמכים`,
`טבע, רפואה וגוף`, `מושגים כלליים` (also the fallback bucket).

Keyword priority (first match wins, scanning each `/`-segment then whole string):
verbs(פעל) → questions(שאל) → expressions(ביטוי/פתגם/נימוס/שבוע/הצגה) →
time&qty(זמן/מספר/כמות/חשבון) → function words(מילות/כינוי/תחביר/שלילה/קישור/חיבור/משפט קניין/קיום)
→ descriptions(תיאור/תאר) → family(משפחה/אנשים/שמות/מידע אישי) →
places(מקום/מבנ/עיר/מדינ/תחבורה/כיוון/תנוע) → objects(חפצ/לבוש/מזון/משק/רכב) →
security(ביטחון/צבא/דרג/פקוד/פשיע/מחבל/מורד/פליט) →
work(עבוד/מקצוע/תפקיד/מוסד/שלטון/פוליטיק/דיפלומט) →
studies(בית ספר/למיד/לימוד/דקדוק/לשון/שפה/מסמכ/מסמך) →
nature(טבע/חיו/רפוא/גוף) → fallback מושגים כלליים. `ERROR` → null.
The mapping is data-driven and easy to tweak; verify the distribution after import.

### Import `app/api/vocabulary/import/route.ts` (canonical importer)
- Detect `word` / `translation` / `semantic_field` / `chapter` (plus existing aliases).
- Build rows: `hebrew_phonetic`, `hebrew_translation`, `semantic_field` (raw),
  `category = mapSemanticField(raw)`, `chapter`.
- Support a `replace` flag (form field): when set, truncate `vocabulary` before insert.

### Initial load `scripts/import-words.mjs`
- Reads `new_words_tavor.xlsx`, applies the same mapping, replace-all loads via the
  Supabase admin client using `.env.local` (`NEXT_PUBLIC_SUPABASE_URL` +
  `SUPABASE_SERVICE_ROLE_KEY`). Prints the category distribution.
- Fallback: admin uploads the file via the **ייבוא Excel** button (now supports the format).

### Types `types/index.ts`
- `VocabularyCategory` → the 14-value union; `CATEGORY_LABELS` → new labels.
- `VocabularyWord`: add `hebrew_phonetic`, `semantic_field`, `chapter: number | null`;
  `arabic_text: string | null`.

### Student view `app/vocabulary/page.tsx`
- Headline = `hebrew_phonetic` (RTL, normal font, no Arabic font/lang).
- Category chips = the 14 buckets; add a chapter (`פרק`) filter (`searchParams.chapter`).
- Search `or()` covers `hebrew_phonetic`, `hebrew_translation`, `semantic_field`.

### Admin `app/admin/vocabulary/*`
- Add/Edit forms: `ערבית *` → `מילה *` (`hebrew_phonetic`); category dropdown → 14 buckets;
  add `chapter` input and optional raw `semantic_field`. Table shows the new columns.

## Out of scope / unaffected
- `inflections` and per-word audio recordings remain optional (file has none → empty).
- TTS is not wired to these words.

## Testing
- `mapSemanticField` unit-checked against representative raw values (incl. compound `/`
  fields and `ERROR`).
- Import: a small fixture xlsx → correct row shape, replace-all clears prior rows.
- `npx tsc --noEmit` clean (per project workflow — not `next build`).
- Manual: student page shows phonetic word + Hebrew translation, category + chapter
  filters work; admin add/edit round-trips.
