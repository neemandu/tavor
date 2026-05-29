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
