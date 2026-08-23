-- 0005: enforce AI talk limits — 10 voice talks/month per student, reset on
-- the 1st. ai_credits already existed (monthly_limit/current_month_usage/
-- last_reset_date) but current_month_usage was never incremented anywhere,
-- so it never actually limited anything. This wires it up.

-- Existing monthly_limit values (default 30) were never enforced, so they
-- were never real limits an admin relied on — reset everyone to the new
-- policy. Admins can still raise/lower per student in /admin/settings.
UPDATE public.ai_credits SET monthly_limit = 10;
ALTER TABLE public.ai_credits ALTER COLUMN monthly_limit SET DEFAULT 10;

-- Atomically checks quota and consumes one talk in a single round trip.
-- Lazily rolls current_month_usage over to 0 when last_reset_date is before
-- the current month, so correctness doesn't depend on the optional
-- reset_monthly_ai_credits() pg_cron job being enabled.
CREATE OR REPLACE FUNCTION public.consume_ai_credit(p_user_id UUID)
RETURNS TABLE(out_allowed BOOLEAN, out_remaining INTEGER, out_limit INTEGER)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_limit INTEGER;
  v_usage INTEGER;
  v_last_reset DATE;
BEGIN
  INSERT INTO public.ai_credits (user_id, monthly_limit, current_month_usage, last_reset_date)
  VALUES (p_user_id, 10, 0, CURRENT_DATE)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT ai_credits.monthly_limit, ai_credits.current_month_usage, ai_credits.last_reset_date
    INTO v_limit, v_usage, v_last_reset
  FROM public.ai_credits
  WHERE ai_credits.user_id = p_user_id
  FOR UPDATE;

  IF v_last_reset < date_trunc('month', CURRENT_DATE) THEN
    v_usage := 0;
  END IF;

  IF v_usage >= v_limit THEN
    UPDATE public.ai_credits
    SET current_month_usage = v_usage, last_reset_date = CURRENT_DATE
    WHERE ai_credits.user_id = p_user_id;
    RETURN QUERY SELECT false, GREATEST(v_limit - v_usage, 0), v_limit;
    RETURN;
  END IF;

  v_usage := v_usage + 1;
  UPDATE public.ai_credits
  SET current_month_usage = v_usage, last_reset_date = CURRENT_DATE
  WHERE ai_credits.user_id = p_user_id;

  RETURN QUERY SELECT true, (v_limit - v_usage), v_limit;
END;
$$;
