-- ============================================================
-- Tavor – Arabic Ulpan: Full Setup Script
-- Paste this entire file into Supabase → SQL Editor and run once.
-- ============================================================


-- ============================================================
-- TABLES
-- ============================================================

-- Users (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('student', 'admin')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Courses
CREATE TABLE IF NOT EXISTS public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT CHECK (type IN ('year', '8_weeks', '5_weeks')),
  is_active BOOLEAN DEFAULT true,
  show_leaderboard BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Student ↔ Course enrollment
CREATE TABLE IF NOT EXISTS public.user_course_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, course_id)
);

-- PDF Handbooks
CREATE TABLE IF NOT EXISTS public.handbooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES public.courses(id),
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  uploaded_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Vocabulary bank
CREATE TABLE IF NOT EXISTS public.vocabulary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  arabic_text TEXT NOT NULL,
  transliteration TEXT,
  hebrew_translation TEXT NOT NULL,
  inflections JSONB,
  category TEXT CHECK (category IN ('security','daily','checkpoint','interrogation','other')),
  recording_path TEXT,
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS vocabulary_search_idx
  ON public.vocabulary USING gin(
    to_tsvector('simple',
      coalesce(arabic_text,'') || ' ' ||
      coalesce(hebrew_translation,'') || ' ' ||
      coalesce(transliteration,'')
    )
  );

-- Exams
CREATE TABLE IF NOT EXISTS public.exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES public.courses(id),
  name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  due_date DATE,
  uploaded_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Exam submissions (student clicked "סיימתי")
CREATE TABLE IF NOT EXISTS public.exam_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  submitted_at TIMESTAMPTZ DEFAULT now(),
  email_sent_at TIMESTAMPTZ,
  UNIQUE(exam_id, user_id)
);

-- Grades
CREATE TABLE IF NOT EXISTS public.grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  score INTEGER CHECK (score BETWEEN 0 AND 100),
  entered_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(exam_id, user_id)
);

-- AI Scenarios
CREATE TABLE IF NOT EXISTS public.scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  student_description TEXT,
  student_role TEXT,
  ai_instructions TEXT,
  voice_instructions TEXT,
  hints JSONB,
  difficulty TEXT CHECK (difficulty IN ('easy','medium','hard')),
  category TEXT CHECK (category IN ('checkpoint','interrogation','market','prison','other')),
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- AI Chat sessions
CREATE TABLE IF NOT EXISTS public.ai_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  scenario_id UUID REFERENCES public.scenarios(id),
  session_type TEXT CHECK (session_type IN ('scenario','free_practice','free_conversation')),
  messages JSONB,
  feedback_text TEXT,
  tokens_used INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ DEFAULT now(),
  ended_at TIMESTAMPTZ
);

-- AI Credits per user (monthly)
CREATE TABLE IF NOT EXISTS public.ai_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
  monthly_limit INTEGER DEFAULT 30,
  current_month_usage INTEGER DEFAULT 0,
  last_reset_date DATE DEFAULT CURRENT_DATE
);

-- Cultural enrichment content
CREATE TABLE IF NOT EXISTS public.enrichment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  category TEXT CHECK (category IN ('culture','geography','religion','levantine','other')),
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Points ledger (one row per event)
CREATE TABLE IF NOT EXISTS public.user_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  points INTEGER NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN ('scenario_complete','exam_score','daily_streak','enrichment_view','letter_learned')),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Daily streaks
CREATE TABLE IF NOT EXISTS public.user_streaks (
  user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_activity_date DATE DEFAULT CURRENT_DATE
);

-- Arabic letter mastery (one row per learned letter per user)
CREATE TABLE IF NOT EXISTS public.letter_progress (
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  letter TEXT NOT NULL,
  completed_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, letter)
);


-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.users              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_course_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.handbooks          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vocabulary         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exams              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_submissions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grades             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scenarios          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_sessions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_credits         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrichment         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_points        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_streaks       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.letter_progress    ENABLE ROW LEVEL SECURITY;

-- Own profile
CREATE POLICY "users_select_own" ON public.users
  FOR SELECT TO authenticated USING (auth.uid() = id);

-- Shared read-only content
CREATE POLICY "courses_select_all" ON public.courses
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "user_course_access_select" ON public.user_course_access
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "handbooks_select_all" ON public.handbooks
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "vocabulary_select_all" ON public.vocabulary
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "exams_select_all" ON public.exams
  FOR SELECT TO authenticated USING (true);

-- Students see only active scenarios; service role (admin pages) sees all
CREATE POLICY "scenarios_select_active" ON public.scenarios
  FOR SELECT TO authenticated USING (is_active = true);

CREATE POLICY "enrichment_select_active" ON public.enrichment
  FOR SELECT TO authenticated USING (is_active = true);

-- Student-scoped rows: own data only
CREATE POLICY "exam_submissions_select_own" ON public.exam_submissions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "grades_select_own" ON public.grades
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "ai_sessions_select_own" ON public.ai_sessions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "ai_credits_select_own" ON public.ai_credits
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "user_points_select_own" ON public.user_points
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "user_streaks_select_own" ON public.user_streaks
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "letter_progress_select_own" ON public.letter_progress
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- All INSERT / UPDATE / DELETE go through server-side API routes
-- using the service_role key, which bypasses RLS automatically.


-- ============================================================
-- STORAGE BUCKETS
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('handbooks',             'handbooks',             false, 52428800, ARRAY['application/pdf']),
  ('vocabulary-recordings', 'vocabulary-recordings', false, 10485760, ARRAY['audio/mpeg','audio/mp4','audio/wav','audio/ogg','audio/webm']),
  ('exams',                 'exams',                 false, 52428800, ARRAY['application/pdf'])
ON CONFLICT (id) DO NOTHING;

-- Authenticated users can read their own files via signed URLs (generated server-side).
-- Service role handles all uploads — no additional storage policies needed.


-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Leaderboard: aggregates points per user for a course and period.
-- SECURITY DEFINER lets it read across all users regardless of RLS.
CREATE OR REPLACE FUNCTION public.get_leaderboard(
  p_course_id UUID DEFAULT NULL,
  p_period    TEXT DEFAULT 'all'
)
RETURNS TABLE(user_id UUID, name TEXT, total_points BIGINT, rank BIGINT)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_since TIMESTAMPTZ;
BEGIN
  IF    p_period = 'week'  THEN v_since := date_trunc('week',  now());
  ELSIF p_period = 'month' THEN v_since := date_trunc('month', now());
  ELSE                          v_since := '1970-01-01'::TIMESTAMPTZ;
  END IF;

  RETURN QUERY
  SELECT
    u.id   AS user_id,
    u.name,
    COALESCE(SUM(up.points), 0) AS total_points,
    RANK() OVER (ORDER BY COALESCE(SUM(up.points), 0) DESC) AS rank
  FROM public.users u
  LEFT JOIN public.user_points up
         ON up.user_id = u.id AND up.created_at >= v_since
  LEFT JOIN public.user_course_access uca
         ON uca.user_id = u.id
  WHERE u.role = 'student'
    AND (p_course_id IS NULL OR uca.course_id = p_course_id)
  GROUP BY u.id, u.name
  ORDER BY total_points DESC
  LIMIT 50;
END;
$$;

-- Monthly AI credit reset.
-- Wire this up to a cron job (see bottom of file).
CREATE OR REPLACE FUNCTION public.reset_monthly_ai_credits()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.ai_credits
  SET current_month_usage = 0,
      last_reset_date     = CURRENT_DATE
  WHERE last_reset_date < date_trunc('month', CURRENT_DATE);
END;
$$;


-- ============================================================
-- CREATE YOUR FIRST ADMIN USER
-- ============================================================
-- 1. Go to Supabase → Authentication → Users → "Add user"
-- 2. Fill in email + password, click Create
-- 3. Copy the UUID from the user row
-- 4. Uncomment the line below, paste the UUID and name, then run it:
--
-- INSERT INTO public.users (id, name, role)
-- VALUES ('<paste-uuid-here>', 'שם המנהל', 'admin');


-- ============================================================
-- OPTIONAL: AUTO-RESET AI CREDITS ON THE 1ST OF EACH MONTH
-- ============================================================
-- Requires the pg_cron extension:
--   Supabase → Database → Extensions → search "pg_cron" → Enable
-- Then run:
--
-- SELECT cron.schedule(
--   'reset-ai-credits',
--   '0 0 1 * *',
--   'SELECT public.reset_monthly_ai_credits()'
-- );


-- ============================================================
-- GAMIFICATION EXPANSION — PHASE 2: ACHIEVEMENTS
-- ============================================================
-- Earned achievements. achievement_id matches the code-defined catalog in
-- lib/achievements.ts (intentionally NOT an FK — adding catalog entries needs
-- no DB migration). PK makes re-awarding idempotent (preserves earned_at).

CREATE TABLE IF NOT EXISTS public.user_achievements (
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  achievement_id TEXT NOT NULL,
  earned_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, achievement_id)
);

ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

-- Writes are service-role (bypass RLS); students read only their own rows.
DROP POLICY IF EXISTS "user_achievements_select_own" ON public.user_achievements;
CREATE POLICY "user_achievements_select_own" ON public.user_achievements
  FOR SELECT TO authenticated USING (auth.uid() = user_id);


-- ============================================================
-- GAMIFICATION EXPANSION — PHASE 3: CROSS-COURSE LEAGUES
-- ============================================================
-- Weekly XP = ledger sum over the same date_trunc('week') window as
-- get_leaderboard, so leagues and the weekly leaderboard stay consistent.
-- Status-only: leagues never write points. Weekly close runs via pg_cron.

-- Tier ladder (1 = lowest). promote/relegate counts are per-division targets,
-- clamped down for small divisions inside close_league_week().
CREATE TABLE IF NOT EXISTS public.league_tiers (
  id INTEGER PRIMARY KEY,
  name_he TEXT NOT NULL,
  icon TEXT,
  promote_count INTEGER NOT NULL DEFAULT 5,
  relegate_count INTEGER NOT NULL DEFAULT 5
);

INSERT INTO public.league_tiers (id, name_he, icon, promote_count, relegate_count) VALUES
  (1, 'ארד',     'Shield', 5, 0),
  (2, 'כסף',     'Shield', 5, 5),
  (3, 'זהב',     'Shield', 5, 5),
  (4, 'פלטינה',  'Shield', 5, 5),
  (5, 'יהלום',   'Shield', 0, 5)
ON CONFLICT (id) DO NOTHING;

-- Which tier/division a user sits in for a given week.
CREATE TABLE IF NOT EXISTS public.league_members (
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  tier_id INTEGER REFERENCES public.league_tiers(id),
  division INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (user_id, week_start)
);

-- Immutable settled results, one row per user per closed week. Hall of fame =
-- rows WHERE outcome = 'champion'.
CREATE TABLE IF NOT EXISTS public.league_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  tier_id INTEGER,
  division INTEGER,
  weekly_xp BIGINT NOT NULL,
  rank_in_division INTEGER NOT NULL,
  outcome TEXT CHECK (outcome IN ('promoted','relegated','stayed','champion')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, week_start)
);

ALTER TABLE public.league_tiers   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.league_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.league_results ENABLE ROW LEVEL SECURITY;

-- Names/standings are already public on the leaderboard, so reads are open to
-- authenticated users; all writes are service-role.
DROP POLICY IF EXISTS "league_tiers_select_all" ON public.league_tiers;
CREATE POLICY "league_tiers_select_all" ON public.league_tiers
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "league_members_select_all" ON public.league_members;
CREATE POLICY "league_members_select_all" ON public.league_members
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "league_results_select_all" ON public.league_results;
CREATE POLICY "league_results_select_all" ON public.league_results
  FOR SELECT TO authenticated USING (true);

-- Standings for the caller's tier+division in a given week (default current).
-- Called server-side with the user id explicit (matches get_leaderboard usage).
CREATE OR REPLACE FUNCTION public.get_league_board(
  p_user_id UUID,
  p_week    DATE DEFAULT NULL
)
RETURNS TABLE(user_id UUID, name TEXT, weekly_xp BIGINT, rank BIGINT, tier_id INTEGER, division INTEGER)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_week DATE := COALESCE(p_week, date_trunc('week', now())::date);
  v_tier INTEGER;
  v_div  INTEGER;
BEGIN
  SELECT lm.tier_id, lm.division INTO v_tier, v_div
  FROM public.league_members lm
  WHERE lm.user_id = p_user_id AND lm.week_start = v_week;

  IF v_tier IS NULL THEN
    RETURN;  -- caller not enrolled this week
  END IF;

  RETURN QUERY
  SELECT
    u.id AS user_id,
    u.name,
    COALESCE(SUM(up.points), 0)::BIGINT AS weekly_xp,
    RANK() OVER (ORDER BY COALESCE(SUM(up.points), 0) DESC) AS rank,
    v_tier AS tier_id,
    v_div  AS division
  FROM public.league_members lm
  JOIN public.users u ON u.id = lm.user_id
  LEFT JOIN public.user_points up
         ON up.user_id = lm.user_id
        AND up.created_at >= v_week
        AND up.created_at <  v_week + 7
  WHERE lm.week_start = v_week
    AND lm.tier_id = v_tier
    AND lm.division = v_div
  GROUP BY u.id, u.name
  ORDER BY weekly_xp DESC;
END;
$$;

-- Enroll any student missing from the CURRENT week at tier 1, split into
-- divisions of <= 30. Idempotent; safe to call on every league-page view.
CREATE OR REPLACE FUNCTION public.ensure_league_membership()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_week DATE := date_trunc('week', now())::date;
  v_cap  CONSTANT INTEGER := 30;
BEGIN
  INSERT INTO public.league_members (user_id, week_start, tier_id, division)
  SELECT
    u.id, v_week, 1,
    ((ROW_NUMBER() OVER (ORDER BY u.id) - 1) / v_cap) + 1
  FROM public.users u
  WHERE u.role = 'student'
    AND NOT EXISTS (
      SELECT 1 FROM public.league_members lm
      WHERE lm.user_id = u.id AND lm.week_start = v_week
    );
END;
$$;

-- Settle the just-ended week (promotion/relegation/champion) and seed the new
-- week's divisions. Idempotent via the league_results guard. Run weekly by cron.
CREATE OR REPLACE FUNCTION public.close_league_week()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_closing  DATE := (date_trunc('week', now()) - interval '7 days')::date;
  v_next     DATE := date_trunc('week', now())::date;
  v_max_tier INTEGER;
  v_cap      CONSTANT INTEGER := 30;
BEGIN
  -- Don't settle the same week twice.
  IF EXISTS (SELECT 1 FROM public.league_results WHERE week_start = v_closing) THEN
    RETURN;
  END IF;

  SELECT MAX(id) INTO v_max_tier FROM public.league_tiers;

  -- 1. Rank each division, decide outcome, write immutable results.
  WITH standings AS (
    SELECT
      lm.user_id, lm.tier_id, lm.division,
      COALESCE(SUM(up.points), 0)::BIGINT AS weekly_xp,
      RANK() OVER (PARTITION BY lm.tier_id, lm.division
                   ORDER BY COALESCE(SUM(up.points), 0) DESC) AS rnk,
      COUNT(*) OVER (PARTITION BY lm.tier_id, lm.division) AS div_size
    FROM public.league_members lm
    LEFT JOIN public.user_points up
           ON up.user_id = lm.user_id
          AND up.created_at >= v_closing
          AND up.created_at <  v_closing + 7
    WHERE lm.week_start = v_closing
    GROUP BY lm.user_id, lm.tier_id, lm.division
  ),
  decided AS (
    SELECT s.*,
      LEAST(t.promote_count,  (s.div_size / 4)) AS n_promote,
      LEAST(t.relegate_count, (s.div_size / 4)) AS n_relegate
    FROM standings s
    JOIN public.league_tiers t ON t.id = s.tier_id
  )
  INSERT INTO public.league_results
    (user_id, week_start, tier_id, division, weekly_xp, rank_in_division, outcome)
  SELECT
    d.user_id, v_closing, d.tier_id, d.division, d.weekly_xp, d.rnk,
    CASE
      WHEN d.tier_id = v_max_tier AND d.rnk = 1 THEN 'champion'
      WHEN d.tier_id < v_max_tier AND d.n_promote > 0 AND d.rnk <= d.n_promote THEN 'promoted'
      WHEN d.tier_id > 1 AND d.n_relegate > 0 AND d.rnk > d.div_size - d.n_relegate THEN 'relegated'
      ELSE 'stayed'
    END
  FROM decided d;

  -- 2. Seed next week: move per outcome, absorb new students at tier 1, then
  --    split each tier into balanced divisions of <= cap by previous rank.
  INSERT INTO public.league_members (user_id, week_start, tier_id, division)
  WITH next_tier AS (
    SELECT
      r.user_id,
      CASE r.outcome
        WHEN 'promoted'  THEN LEAST(r.tier_id + 1, v_max_tier)
        WHEN 'relegated' THEN GREATEST(r.tier_id - 1, 1)
        ELSE r.tier_id
      END AS tier_id,
      r.rank_in_division AS prev_rank
    FROM public.league_results r
    WHERE r.week_start = v_closing
    UNION ALL
    SELECT u.id, 1, 999999
    FROM public.users u
    WHERE u.role = 'student'
      AND NOT EXISTS (
        SELECT 1 FROM public.league_results r2
        WHERE r2.week_start = v_closing AND r2.user_id = u.id
      )
  )
  SELECT
    nt.user_id, v_next, nt.tier_id,
    ((ROW_NUMBER() OVER (PARTITION BY nt.tier_id ORDER BY nt.prev_rank, nt.user_id) - 1) / v_cap) + 1
  FROM next_tier nt
  ON CONFLICT (user_id, week_start) DO NOTHING;
END;
$$;

-- ------------------------------------------------------------
-- OPTIONAL: AUTO-CLOSE THE LEAGUE WEEK EVERY MONDAY (pg_cron)
-- ------------------------------------------------------------
-- Requires the pg_cron extension (Supabase → Database → Extensions → pg_cron).
-- date_trunc('week') is Monday-based; this fires Monday 00:05 UTC.
-- Run ensure_league_membership() once after deploy for the cold start.
--
-- SELECT cron.schedule(
--   'close-league-week',
--   '5 0 * * 1',
--   'SELECT public.close_league_week()'
-- );


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
