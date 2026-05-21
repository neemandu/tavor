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
