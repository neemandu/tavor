# Admin-editable AI prompt management

## Context

Today the AI agent's instructions live in three places: a hardcoded base persona
("Khalid") in `lib/khalid-character.ts`, hardcoded free-practice/free-conversation and
feedback templates in `lib/claude.ts` and the `convai-feedback`/`free-chat` routes, and
per-scenario fields (`ai_instructions`, `voice_instructions`, `hints`) in the DB —
already editable in `/admin/scenarios`. The voice agent's dashboard prompt in ElevenLabs
is irrelevant: the app overrides it every session.

The admin wants to edit the global agent instructions from the app (like they did
manually in the ElevenLabs dashboard) instead of in code. This makes the four global
prompt blocks DB-stored and editable in admin, while keeping the dynamic-data injection
as fixed, code-controlled scaffolding so it can't be broken.

## How it reaches the models (no ElevenLabs agent API)

- **Voice:** `/api/ai/convai-token` composes `persona + scaffolding + scenario data` into
  one `systemPrompt`, which the client sends to ElevenLabs as a conversation-level override
  (`overrides.agent.prompt.prompt`, `hooks/use-convai.ts:30`). ElevenLabs runs that session
  with the override as the system prompt; the dashboard agent is never modified. (Requires
  the agent's prompt/language overrides to be enabled — already the case today.)
- **Text:** the same composed string is the Anthropic system prompt (no ElevenLabs).

## Decisions (locked)

- Editable blocks: **persona, free practice, free conversation, feedback** (4 global texts).
- **Persona applies to both voice and text** practice (one consistent agent).
- Editing style: **editable persona/behavior text + fixed code scaffolding** (admin edits the
  text; the app keeps transcript/situation/scenario injection in code).
- Per-scenario instructions stay in `/admin/scenarios` (unchanged); the new page links to it.
- **No ElevenLabs agent API calls** — the existing runtime override carries the text.
- Blank/missing value → fall back to the code default (agent can never be left prompt-less).

## Data model

Key-value config table (lets us add prompts later without a migration):

```sql
CREATE TABLE IF NOT EXISTS public.app_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;
-- No SELECT policy: only the service role (admin routes + server prompt loader) reads/writes.
```

Keys: `ai_persona`, `ai_free_practice`, `ai_free_conversation`, `ai_feedback`. Seeded with
today's hardcoded text via `supabase/migrations/0003_app_config.sql` (and re-asserted as code
`DEFAULTS`, so behavior is unchanged until an admin edits something).

## Components

- **`lib/ai-config.ts`** — `DEFAULTS` (the current hardcoded strings, extracted verbatim) +
  `loadAiConfig()`: reads `app_config` via `createAdminClient()`, returns
  `{ persona, freePractice, freeConversation, feedback }` with each blank/missing value
  filled from `DEFAULTS`. Short per-request use (single small table read).
- **Builder refactor** — make the prompt builders take the editable text as parameters
  instead of hardcoding it; scaffolding stays inside:
  - `lib/khalid-character.ts`: `buildKhalidScenarioPrompt`, `buildKhalidFreePracticePrompt`,
    `buildKhalidFreeConversationPrompt` take `persona` (+ the relevant mode text).
  - `lib/claude.ts`: `buildScenarioSystemPrompt` takes `persona`; feedback builder takes
    `feedback`.
- **Route wiring** — load config and pass it through:
  `app/api/ai/convai-token`, `convai-feedback`, `chat`, `free-chat`, `feedback`.
- **Admin UI** — `app/admin/ai/page.tsx` (server, loads current values) + a client form: one
  labeled `Textarea` per block with a **"reset to default"** button, saved via
  `PATCH /api/admin/ai-config` (`requireAdmin` → upsert rows). New "הנחיות AI" item in
  `components/admin-shell.tsx`, plus a note/link to `/admin/scenarios` for per-scenario text.

## Data flow

Admin edits a block → `PATCH /api/admin/ai-config` upserts `app_config` → next session/feedback,
the AI route calls `loadAiConfig()` → passes the (edited or default) text into the builder →
builder wraps it with fixed scaffolding + dynamic data → sent as the ElevenLabs override (voice)
or the Anthropic system prompt (text/feedback).

## Error handling

- Missing/blank value → code `DEFAULTS` (loader guarantees non-empty output).
- Config read failure → `loadAiConfig()` returns all `DEFAULTS` (AI keeps working).
- Admin save failure → 500 + Hebrew error toast; nothing partially applied (upsert per row).

## Testing

- `npm run build` clean.
- Manual: edit the persona in `/admin/ai` → start a **voice** session and a **text** session →
  confirm the new persona takes effect in both; trigger feedback → confirm the feedback block
  applies; blank a field + save → confirm it falls back to the default and the agent still works.

## Out of scope (YAGNI)

Editing the ElevenLabs dashboard agent via its API; per-scenario editing changes (already done);
versioning/history of prompt edits; placeholder/template editing (scaffolding stays in code).
