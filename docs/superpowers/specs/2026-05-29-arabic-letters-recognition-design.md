# Arabic Letters — Recognition & Connected Reading

## Context

Tavor's current Arabic-letters feature (`/letters`) is a *tracing + self-mark* flow:
a grid hub, a per-letter page showing the glyph, TTS of the letter's **name** (not its
sound), a static display of the 4 forms, a Hebrew stroke-hint, and a freehand drawing
canvas. The student doodles, taps "סיימתי", and gets 2 points. Mastery is binary and
self-declared — there is no recognition, no verification, no connected-reading practice.

The goal is to teach **reading**: recognizing each letter and its 4 connected forms, and
reading letters joined into clusters. Handwriting and pronunciation are explicitly out of
scope. The tracing canvas and the standalone study page are being removed.

This replaces the per-letter experience with a **client-side recognition practice engine**
that verifies learning through two exercise types, both fully derived from the existing
static letter data (`lib/arabic-letters.ts`) — no new content authoring, no vocabulary
dependency.

## Decisions (locked)

- **Primary skill:** recognition/reading + connected reading. Not handwriting, not pronunciation.
- **Mechanism:** a mixed recognition practice engine across letters; mastery earned by
  correct answers (not self-declared).
- **Exercise types:** (1) *identify the form*, (2) *read a cluster*. No isolated letter→name MCQ.
- **Word source:** auto-generated clusters (concatenated base letters; the renderer shapes
  them; non-connecting letters break the join — which teaches that rule).
- **Per-letter page:** replaced entirely — tapping a letter opens focused practice; the
  study page and canvas are removed.
- **Engine:** client-side; server only records results (approach A) with in-session
  resurfacing of missed letters (no persisted SRS schedule).
- **Mastery threshold:** a letter answered correctly in **4** distinct questions (tunable constant).

## Data model

Keep `letter_progress` as the mastery source of truth (rows = mastered letters), so the hub
checkmarks, the `all_letters` achievement, and the home "letters learned" count keep working
unchanged. Add one table for in-progress counts:

```sql
CREATE TABLE IF NOT EXISTS public.letter_practice (
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  letter TEXT NOT NULL,
  correct_count INTEGER NOT NULL DEFAULT 0,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  last_practiced_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, letter)
);
ALTER TABLE public.letter_practice ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "letter_practice_select_own" ON public.letter_practice;
CREATE POLICY "letter_practice_select_own" ON public.letter_practice
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
```

Appended as an idempotent block to `supabase/schema.sql` and extracted to
`supabase/migrations/0002_letter_practice.sql` (the schema file can't be re-run wholesale —
its original `CREATE POLICY` lines aren't idempotent).

## Components

### `lib/letter-exercises.ts` (pure, no Supabase/React)
- **Shape-similarity map**: groups of visually-confusable letters for distractors —
  ب/ت/ث/ن/ي · ج/ح/خ · د/ذ · ر/ز · س/ش · ص/ض · ط/ظ · ع/غ · ف/ق · (others stand alone).
- `makeFormQuestion(target, pool)`: pick a form (initial/medial/final), return the rendered
  form glyph + 3–4 letter choices (target + similarity-biased distractors, target never duplicated).
- `makeClusterQuestion(letters)`: choose 2–3 letters (connectivity-aware so a non-connecting
  letter only sits where it can), return the concatenated cluster string + the ordered correct
  letter sequence + a small palette (correct letters + 1–2 distractors).
- `buildSession(stats, mode, letterId?)`: returns an ordered queue of ~10–12 questions.
  Mixed mode weights toward not-yet-mastered / fewest-attempts letters; focused mode targets
  one letter (clusters use easy neighbors). Pure given an injected RNG seed (varied by caller).
- Exercise result types carry which letter(s) a correct answer credits.

### Practice UI (client)
- `app/letters/practice/letter-practice-session.tsx`: the engine runner. Renders the current
  question, choice buttons (form) or an ordered tap-palette (cluster), instant feedback (shows
  the correct answer on a miss), in-session progress, missed-letter resurfacing, and an end
  summary (accuracy, newly-mastered letters, points). On finish, POSTs results.
- `MeetLetterCard`: shown at the start of focused practice — glyph, audio button (existing
  `useTTS`), the 4 forms, stroke-hint text, then "התחל תרגול".

### Routes
- `app/letters/page.tsx` (hub): keep grid + progress bar; add a primary **"תרגול"** CTA →
  `/letters/practice` (mixed).
- `app/letters/practice/page.tsx`: server wrapper (auth, loads `letter_practice` + `letter_progress`
  to compute per-letter state), renders the session in mixed mode.
- `app/letters/[id]/page.tsx`: repurposed to focused practice for that letter (meet-the-letter
  card → focused session). The old `letter-practice.tsx` canvas component is deleted.

### API
- `POST /api/letters/practice`: body = per-letter deltas `[{ letter, correct, attempts }]`.
  Increments `letter_practice`; for any letter whose `correct_count` crosses the threshold AND
  that has no `letter_progress` row yet: upsert `letter_progress` then `awardPoints(2,
  "letter_learned", { letter })`. Returns `{ newlyMastered: string[] }`. Mastery/points fire
  at most once per letter (fixes the current route's re-award-on-every-save bug).
- `POST /api/letters/progress` and its caller are removed.

## Data flow

Hub/focused page (server) reads `letter_practice` + `letter_progress` → passes per-letter
state to the client session → engine generates questions client-side from `ARABIC_LETTERS`
→ student answers → on finish the client POSTs aggregated per-letter deltas → server updates
counts, flips newly-crossed letters to mastered, awards points once, returns newly-mastered →
client shows the summary; the `all_letters` achievement fires through the existing
`awardPoints` pipeline when the 28th letter is mastered.

## Error handling

- Engine is resilient to a failed results POST: it shows the summary regardless and surfaces a
  non-blocking error toast; counts can be re-earned next session (idempotent increments are
  fine because mastery/points are guarded by the no-existing-`letter_progress` check).
- Non-connecting letters: generation never places a connecting letter to the left of a
  non-connecting one expecting a join; form selection uses the data's own form strings.
- Degraded data: if `ELEVENLABS` audio is unavailable, the meet-the-letter audio button no-ops
  (existing `useTTS` behavior); recognition exercises don't depend on audio.

## Testing

- Node-verify the pure generators in `lib/letter-exercises.ts`:
  - clusters break the join at non-connecting letters; cluster length 2–3.
  - form-question choices include the target exactly once and have the configured count.
  - distractors are drawn from the similarity group when one exists.
  - `buildSession` returns the right length and never includes already-mastered letters in
    mixed mode unless the unmastered pool is exhausted.
- Manual: a session increments counts; 4 correct flips a letter to mastered → 2 points +
  green checkmark on the hub; mastering all 28 fires `all_letters`; results POST failure still
  shows the summary.
- `npm run build` compiles clean.

## Out of scope (YAGNI)

Handwriting/stroke validation, pronunciation capture, persisted spaced-repetition scheduling,
isolated letter→name MCQ, curated word lists, per-form mastery granularity.
