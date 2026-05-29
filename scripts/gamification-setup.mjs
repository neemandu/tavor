// One-off post-migration setup, run with the service-role key:
//   1. verify the migration landed (league_tiers seeded)
//   2. cold-start league membership for the current week
//   3. backfill achievements for existing students
// Safe to re-run (everything is idempotent).

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

// --- load .env.local ---
const env = {};
for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Missing Supabase env vars");

const db = createClient(url, key, { auth: { persistSession: false } });

// --- mirror of lib/levels.ts + lib/achievements.ts (kept inline for this script) ---
const ARABIC_LETTER_COUNT = 28;
const xpForLevel = (L) => (L <= 1 ? 0 : 50 * L * (L - 1));
function levelFromXp(xp) {
  if (xp <= 0) return 1;
  let l = Math.floor((1 + Math.sqrt(1 + xp / 12.5)) / 2);
  if (l < 1) l = 1;
  while (xpForLevel(l + 1) <= xp) l++;
  while (l > 1 && xpForLevel(l) > xp) l--;
  return l;
}
const CATALOG = [
  ["first_scenario", (s) => s.scenarios >= 1],
  ["scenarios_10", (s) => s.scenarios >= 10],
  ["streak_7", (s) => s.streak >= 7],
  ["streak_30", (s) => s.streak >= 30],
  ["all_letters", (s) => s.letters >= ARABIC_LETTER_COUNT],
  ["enrichment_5", (s) => s.enrichment >= 5],
  ["level_5", (s) => levelFromXp(s.xp) >= 5],
  ["level_10", (s) => levelFromXp(s.xp) >= 10],
  ["xp_1000", (s) => s.xp >= 1000],
];

async function main() {
  // 1. verify migration
  const { data: tiers, error: tierErr } = await db.from("league_tiers").select("id, name_he");
  if (tierErr) throw new Error("league_tiers not found — did the migration run? " + tierErr.message);
  console.log(`✓ league_tiers present (${tiers.length} tiers): ${tiers.map((t) => t.name_he).join(", ")}`);

  // 2. league cold-start
  const { error: ensureErr } = await db.rpc("ensure_league_membership");
  if (ensureErr) throw new Error("ensure_league_membership failed: " + ensureErr.message);
  const { count: memberCount } = await db
    .from("league_members")
    .select("*", { count: "exact", head: true });
  console.log(`✓ ensure_league_membership ran — ${memberCount} membership rows this week`);

  // 3. achievements backfill
  const { data: students, error: stuErr } = await db.from("users").select("id").eq("role", "student");
  if (stuErr) throw new Error("students query failed: " + stuErr.message);
  console.log(`Backfilling achievements for ${students.length} students…`);

  let granted = 0;
  for (const { id } of students) {
    const [{ data: pts }, { data: streak }, lettersC, enrichC, scenC] = await Promise.all([
      db.from("user_points").select("points").eq("user_id", id),
      db.from("user_streaks").select("current_streak").eq("user_id", id).maybeSingle(),
      db.from("letter_progress").select("*", { count: "exact", head: true }).eq("user_id", id),
      db.from("user_points").select("*", { count: "exact", head: true }).eq("user_id", id).eq("reason", "enrichment_view"),
      db.from("user_points").select("*", { count: "exact", head: true }).eq("user_id", id).eq("reason", "scenario_complete"),
    ]);
    const stats = {
      xp: (pts ?? []).reduce((sum, r) => sum + (r.points ?? 0), 0),
      streak: streak?.current_streak ?? 0,
      letters: lettersC.count ?? 0,
      enrichment: enrichC.count ?? 0,
      scenarios: scenC.count ?? 0,
    };
    const earned = CATALOG.filter(([, fn]) => fn(stats)).map(([aid]) => ({ user_id: id, achievement_id: aid }));
    if (earned.length) {
      const { error } = await db
        .from("user_achievements")
        .upsert(earned, { onConflict: "user_id,achievement_id", ignoreDuplicates: true });
      if (error) console.error(`  ! upsert failed for ${id}: ${error.message}`);
      else granted += earned.length;
    }
  }
  console.log(`✓ achievements backfill complete — ${granted} (re)granted across students`);
  console.log("\nRemaining manual step: enable pg_cron + run the cron.schedule line in the SQL Editor.");
}

main().catch((e) => {
  console.error("SETUP FAILED:", e.message);
  process.exit(1);
});
