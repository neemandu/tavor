import { createAdminClient } from "@/lib/supabase/server";

type AdminClient = ReturnType<typeof createAdminClient>;

export interface AiCreditsRemaining {
  remaining: number;
  limit: number;
}

/**
 * Read-only remaining-talks lookup for display (home page, ai-practice
 * landing pages). Mirrors the lazy monthly reset that consumeAiCredit()
 * applies, so the count doesn't look stale on the 1st before the student's
 * first talk of the month actually rolls it over in the DB.
 */
export async function getRemainingAiCredits(
  adminSupabase: AdminClient,
  userId: string
): Promise<AiCreditsRemaining | null> {
  const { data } = await adminSupabase
    .from("ai_credits")
    .select("monthly_limit, current_month_usage, last_reset_date")
    .eq("user_id", userId)
    .maybeSingle();

  if (!data) return null;

  const lastReset = new Date(data.last_reset_date);
  const now = new Date();
  const isStale =
    lastReset.getUTCFullYear() < now.getUTCFullYear() ||
    (lastReset.getUTCFullYear() === now.getUTCFullYear() && lastReset.getUTCMonth() < now.getUTCMonth());

  const usage = isStale ? 0 : data.current_month_usage;
  return { remaining: Math.max(data.monthly_limit - usage, 0), limit: data.monthly_limit };
}

export interface ConsumeAiCreditResult {
  allowed: boolean;
  remaining: number;
  limit: number;
}

/**
 * Atomically checks quota and consumes one talk (via the consume_ai_credit
 * Postgres function — see supabase/migrations/0005_ai_talk_limits.sql).
 * Call this only after a voice session is actually about to start, so
 * infra failures upstream don't burn a talk.
 */
export async function consumeAiCredit(
  adminSupabase: AdminClient,
  userId: string
): Promise<ConsumeAiCreditResult> {
  const { data, error } = await adminSupabase
    .rpc("consume_ai_credit", { p_user_id: userId })
    .single();

  if (error || !data) {
    console.error("consume_ai_credit RPC failed:", error);
    // Fail open: a DB hiccup shouldn't block a student from practicing.
    return { allowed: true, remaining: 0, limit: 0 };
  }

  const row = data as { out_allowed: boolean; out_remaining: number; out_limit: number };
  return { allowed: row.out_allowed, remaining: row.out_remaining, limit: row.out_limit };
}
