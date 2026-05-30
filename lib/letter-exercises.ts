// Pure recognition-exercise generators for Arabic letters. No Supabase/React
// imports — questions are generated in the browser from the static letter data.
//
// Two exercise types:
//   - "form":    show a connected form (initial/medial/final), pick the letter.
//   - "cluster": show 2-3 joined letters, tap them in reading order (right→left).
//
// Arabic shapes automatically when base letters are concatenated; non-connecting
// letters (alef/dal/dhal/ra/zay/waw) naturally break the join.

import { ARABIC_LETTERS, type ArabicLetter } from "@/lib/arabic-letters";

export const MASTERY_THRESHOLD = 4; // correct answers needed to master a letter

export const LETTER_BY_ID: Record<string, ArabicLetter> = Object.fromEntries(
  ARABIC_LETTERS.map((l) => [l.id, l])
);

const ALL_IDS = ARABIC_LETTERS.map((l) => l.id);
// Letters that join to the following letter. A cluster only renders as one
// connected shape if every letter EXCEPT the last is connecting.
const CONNECTING_IDS = ARABIC_LETTERS.filter((l) => l.connects).map((l) => l.id);

export type FormKey = "initial" | "medial" | "final";

export type FormQuestion = {
  kind: "form";
  letterId: string; // credited letter
  glyph: string; // the connected form to display
  formKey: FormKey;
  choices: string[]; // letter ids, shuffled, includes letterId
};

export type ClusterQuestion = {
  kind: "cluster";
  cluster: string; // connected display string
  sequence: string[]; // ordered correct letter ids (reading order = logical order)
  palette: string[]; // letter ids to tap from (sequence + distractors), shuffled
};

export type Question = FormQuestion | ClusterQuestion;

// Visually-confusable letters — used so wrong choices are meaningful, not random.
const SIMILARITY_GROUPS: string[][] = [
  ["ba", "ta", "tha", "nun", "ya"], // the "tooth"
  ["jim", "ha", "kha"],
  ["dal", "dhal"],
  ["ra", "zay"],
  ["sin", "shin"],
  ["sad", "dad"],
  ["ta2", "dha2"],
  ["ain", "ghain"],
  ["fa", "qaf"],
];

type Rng = () => number;

function shuffle<T>(arr: T[], rng: Rng): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function sampleN<T>(arr: T[], n: number, rng: Rng): T[] {
  return shuffle(arr, rng).slice(0, n);
}

function pickOne<T>(arr: T[], rng: Rng): T {
  return arr[Math.floor(rng() * arr.length)];
}

// Distractors biased toward the target's shape group, topped up with random others.
function distractorsFor(targetId: string, count: number, rng: Rng): string[] {
  const group = SIMILARITY_GROUPS.find((g) => g.includes(targetId)) ?? [];
  const sameShape = group.filter((id) => id !== targetId);
  const others = ALL_IDS.filter((id) => id !== targetId && !sameShape.includes(id));
  const chosen = sampleN(sameShape, count, rng);
  if (chosen.length < count) {
    chosen.push(...sampleN(others, count - chosen.length, rng));
  }
  return chosen.slice(0, count);
}

const FORM_KEYS: FormKey[] = ["initial", "medial", "final"];

export function makeFormQuestion(
  targetId: string,
  rng: Rng = Math.random,
  numChoices = 4
): FormQuestion {
  const letter = LETTER_BY_ID[targetId];
  const formKey = pickOne(FORM_KEYS, rng);
  const distractors = distractorsFor(targetId, numChoices - 1, rng);
  return {
    kind: "form",
    letterId: targetId,
    glyph: letter.forms[formKey],
    formKey,
    choices: shuffle([targetId, ...distractors], rng),
  };
}

export function makeClusterQuestion(
  pool: string[],
  rng: Rng = Math.random,
  opts: { mustInclude?: string; minLen?: number; maxLen?: number } = {}
): ClusterQuestion {
  const minLen = opts.minLen ?? 2;
  const maxLen = opts.maxLen ?? 3;
  const len = minLen + Math.floor(rng() * (maxLen - minLen + 1));
  const must = opts.mustInclude;

  // Non-final positions MUST connect to the next letter, so the cluster renders
  // fully joined (letters morph into initial/medial forms — the actual skill).
  const connectingPool = pool.filter((id) => LETTER_BY_ID[id]?.connects);
  const connectingSource = connectingPool.length >= len - 1 ? connectingPool : CONNECTING_IDS;
  const nonFinal = sampleN(connectingSource, len - 1, rng);

  // The last letter can be anything — it still joins from the right.
  const finalCandidates = (pool.length ? pool : ALL_IDS).filter((id) => !nonFinal.includes(id));
  const finalLetter = pickOne(
    finalCandidates.length ? finalCandidates : ALL_IDS.filter((id) => !nonFinal.includes(id)),
    rng
  );

  const ids = [...nonFinal, finalLetter];

  // Place the credited target where it's valid: connecting letters anywhere,
  // non-connecting only as the final letter (else it would break the join).
  if (must && !ids.includes(must)) {
    if (LETTER_BY_ID[must].connects) {
      ids[Math.floor(rng() * len)] = must;
    } else {
      ids[len - 1] = must;
    }
  }

  const cluster = ids.map((id) => LETTER_BY_ID[id].arabic).join("");
  const distractorPool = ALL_IDS.filter((id) => !ids.includes(id));
  const palette = shuffle([...ids, ...sampleN(distractorPool, 2, rng)], rng);

  return { kind: "cluster", cluster, sequence: ids, palette };
}

export type LetterStat = { correct: number; mastered: boolean };

// Builds an ordered queue of ~`count` questions. Mixed mode weights toward
// not-yet-mastered, fewest-correct letters; focused mode targets one letter.
export function buildSession(
  stats: Record<string, LetterStat>,
  opts: { mode: "mixed" | "focused"; letterId?: string; count?: number; rng?: Rng }
): Question[] {
  const rng = opts.rng ?? Math.random;
  const count = opts.count ?? 10;

  let targetPool: string[];
  if (opts.mode === "focused" && opts.letterId) {
    targetPool = [opts.letterId];
  } else {
    const unmastered = ALL_IDS.filter((id) => !stats[id]?.mastered);
    targetPool = (unmastered.length > 0 ? unmastered : ALL_IDS)
      .slice()
      .sort((a, b) => (stats[a]?.correct ?? 0) - (stats[b]?.correct ?? 0));
  }

  const neighbors =
    opts.mode === "focused"
      ? ALL_IDS.filter((id) => id !== opts.letterId)
      : targetPool;

  const questions: Question[] = [];
  for (let i = 0; i < count; i++) {
    const useForm = rng() < 0.5;
    const target =
      opts.mode === "focused" && opts.letterId
        ? opts.letterId
        : targetPool[i % targetPool.length];

    if (useForm) {
      questions.push(makeFormQuestion(target, rng));
    } else {
      const pool =
        opts.mode === "focused" ? sampleN(neighbors, 4, rng) : targetPool;
      questions.push(makeClusterQuestion(pool, rng, { mustInclude: target }));
    }
  }
  return questions;
}
