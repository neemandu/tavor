// Pure level/XP math. No Supabase or React imports — safe to use anywhere.
//
// Lifetime XP is the sum of user_points.points. Level is derived on read.
//
// Escalating curve (cumulative quadratic): the XP required to *reach* level L is
//   xpForLevel(L) = 50 * L * (L - 1)
// giving thresholds 0, 100, 300, 600, 1000, 1500, ... (per-level gaps 100, 200, 300, ...).

/** Total lifetime XP required to reach level `level` (level 1 starts at 0). */
export function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  return 50 * level * (level - 1);
}

/** The level a given lifetime XP total corresponds to (minimum 1). */
export function levelFromXp(xp: number): number {
  if (xp <= 0) return 1;
  // Closed-form inverse of xpForLevel; then correct any floating-point drift
  // against the exact integer thresholds.
  let level = Math.floor((1 + Math.sqrt(1 + xp / 12.5)) / 2);
  if (level < 1) level = 1;
  while (xpForLevel(level + 1) <= xp) level++;
  while (level > 1 && xpForLevel(level) > xp) level--;
  return level;
}

export type LevelProgress = {
  level: number;
  /** XP accumulated within the current level. */
  xpIntoLevel: number;
  /** Total XP span of the current level (next threshold - current threshold). */
  xpForThisLevel: number;
  /** XP remaining until the next level. */
  xpToNext: number;
  /** Progress through the current level, 0-100 (for the Progress component). */
  progressPct: number;
};

/** Full progress breakdown for a given lifetime XP total. */
export function levelProgress(xp: number): LevelProgress {
  const safeXp = Math.max(0, xp);
  const level = levelFromXp(safeXp);
  const start = xpForLevel(level);
  const nextThreshold = xpForLevel(level + 1);
  const xpForThisLevel = nextThreshold - start;
  const xpIntoLevel = safeXp - start;
  const xpToNext = nextThreshold - safeXp;
  const progressPct =
    xpForThisLevel > 0
      ? Math.min(100, Math.round((xpIntoLevel / xpForThisLevel) * 100))
      : 0;
  return { level, xpIntoLevel, xpForThisLevel, xpToNext, progressPct };
}
