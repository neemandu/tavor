-- ============================================================
-- APP CONFIG — editable AI prompts (and future global settings)
-- ============================================================
-- Key-value store. AI prompt blocks (ai_persona, ai_free_practice,
-- ai_free_conversation, ai_feedback) are edited in /admin/ai. Blank/missing
-- values fall back to code defaults in lib/ai-config.ts, so behavior is
-- unchanged until an admin overrides something. Read/written only by the
-- service role (admin routes + the server prompt loader) — no public policy.

CREATE TABLE IF NOT EXISTS public.app_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;
