// Predefined, code-defined achievement catalog + a pure evaluator.
// No Supabase or React imports — the evaluator runs server-side (awarding) and
// the catalog is read by the trophy-case UI (locked items shown as goals).

import { ARABIC_LETTERS } from "@/lib/arabic-letters";
import { levelFromXp } from "@/lib/levels";

// Stats derived from existing tables/ledger. Keep in sync with the builder in
// lib/achievements-server.ts and the /api/me/stats shape.
export type UserStats = {
  lifetimeXp: number;
  currentStreak: number;
  longestStreak: number;
  lettersLearned: number;
  enrichmentViews: number;
  scenariosCompleted: number;
};

// Data-driven condition (not arbitrary code) so the same descriptor drives both
// awarding and rendering "goal" text for locked achievements.
type ConditionKind =
  | "lifetime_xp_gte"
  | "level_gte"
  | "current_streak_gte"
  | "longest_streak_gte"
  | "letters_learned_gte"
  | "enrichment_views_gte"
  | "scenarios_completed_gte";

export type AchievementCondition = { kind: ConditionKind; value: number };

export type Achievement = {
  id: string;
  title_he: string;
  description_he: string;
  /** lucide icon name, resolved to a component in the UI (keeps this module server-safe). */
  icon: string;
  condition: AchievementCondition;
};

export const ARABIC_LETTER_COUNT = ARABIC_LETTERS.length;

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: "first_scenario",
    title_he: "תרחיש ראשון",
    description_he: "השלם תרחיש תרגול אחד",
    icon: "MessageSquare",
    condition: { kind: "scenarios_completed_gte", value: 1 },
  },
  {
    id: "scenarios_10",
    title_he: "10 תרחישים",
    description_he: "השלם 10 תרחישי תרגול",
    icon: "MessageSquare",
    condition: { kind: "scenarios_completed_gte", value: 10 },
  },
  {
    id: "streak_7",
    title_he: "רצף 7 ימים",
    description_he: "התאמן 7 ימים ברציפות",
    icon: "Flame",
    condition: { kind: "current_streak_gte", value: 7 },
  },
  {
    id: "streak_30",
    title_he: "רצף 30 ימים",
    description_he: "התאמן 30 ימים ברציפות",
    icon: "Flame",
    condition: { kind: "current_streak_gte", value: 30 },
  },
  {
    id: "all_letters",
    title_he: "כל האותיות",
    description_he: `שלוט בכל ${ARABIC_LETTER_COUNT} האותיות`,
    icon: "PenLine",
    condition: { kind: "letters_learned_gte", value: ARABIC_LETTER_COUNT },
  },
  {
    id: "enrichment_5",
    title_he: "5 תכני העשרה",
    description_he: "צפה ב-5 תכני העשרה",
    icon: "Globe",
    condition: { kind: "enrichment_views_gte", value: 5 },
  },
  {
    id: "level_5",
    title_he: "רמה 5",
    description_he: "הגע לרמה 5",
    icon: "Star",
    condition: { kind: "level_gte", value: 5 },
  },
  {
    id: "level_10",
    title_he: "רמה 10",
    description_he: "הגע לרמה 10",
    icon: "Star",
    condition: { kind: "level_gte", value: 10 },
  },
  {
    id: "xp_1000",
    title_he: "1000 נקודות",
    description_he: "צבור 1000 נקודות XP",
    icon: "Trophy",
    condition: { kind: "lifetime_xp_gte", value: 1000 },
  },
];

/** True if the given stats satisfy a single condition. */
export function conditionMet(c: AchievementCondition, stats: UserStats): boolean {
  switch (c.kind) {
    case "lifetime_xp_gte":
      return stats.lifetimeXp >= c.value;
    case "level_gte":
      return levelFromXp(stats.lifetimeXp) >= c.value;
    case "current_streak_gte":
      return stats.currentStreak >= c.value;
    case "longest_streak_gte":
      return stats.longestStreak >= c.value;
    case "letters_learned_gte":
      return stats.lettersLearned >= c.value;
    case "enrichment_views_gte":
      return stats.enrichmentViews >= c.value;
    case "scenarios_completed_gte":
      return stats.scenariosCompleted >= c.value;
    default:
      return false;
  }
}

/** Returns the ids of all achievements whose condition is met by these stats. */
export function evaluateAchievements(stats: UserStats): string[] {
  return ACHIEVEMENTS.filter((a) => conditionMet(a.condition, stats)).map((a) => a.id);
}
