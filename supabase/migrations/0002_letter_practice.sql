-- ============================================================
-- ARABIC LETTERS — RECOGNITION PRACTICE
-- ============================================================
-- Per-letter recognition progress (counts). letter_progress stays the binary
-- "mastered" source of truth; this tracks counts on the way to mastery.

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
