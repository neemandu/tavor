export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { StudentShell } from "@/components/student-shell";
import { CATEGORY_LABELS, VOCAB_CATEGORIES, type VocabularyCategory } from "@/types";
import { AudioPlayer } from "./audio-player";
import { VocabularySearchBar } from "./search-bar";
import { cn } from "@/lib/utils";

interface PageProps {
  searchParams: Promise<{ q?: string; cat?: string; chapter?: string }>;
}

export default async function VocabularyPage({ searchParams }: PageProps) {
  const { q, cat, chapter } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("vocabulary")
    .select("*")
    .order("chapter", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(50);

  if (q?.trim()) {
    query = query.or(
      `hebrew_phonetic.ilike.%${q}%,hebrew_translation.ilike.%${q}%,semantic_field.ilike.%${q}%,transliteration.ilike.%${q}%`
    );
  }

  if (cat && cat !== "all") {
    query = query.eq("category", cat);
  }

  if (chapter && chapter !== "all") {
    query = query.eq("chapter", chapter);
  }

  const { data: wordsData } = await query;
  const words = wordsData ?? [];

  // Distinct chapters present (small set of ints), for the chapter filter.
  const { data: chapterRows } = await supabase
    .from("vocabulary")
    .select("chapter")
    .not("chapter", "is", null);
  const chapters = Array.from(
    new Set((chapterRows ?? []).map((r) => r.chapter as number))
  ).sort((a, b) => a - b);

  const categories = ["all", ...VOCAB_CATEGORIES] as const;
  const activeCat = cat && cat !== "all" ? cat : "all";
  const activeChapter = chapter && chapter !== "all" ? chapter : "all";

  // Preserve other filters when building a filter link.
  const linkFor = (next: { cat?: string; chapter?: string }) => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    const c = next.cat ?? activeCat;
    const ch = next.chapter ?? activeChapter;
    if (c !== "all") p.set("cat", c);
    if (ch !== "all") p.set("chapter", ch);
    const qs = p.toString();
    return `/vocabulary${qs ? `?${qs}` : ""}`;
  };

  return (
    <StudentShell>
      <div className="p-4 max-w-lg mx-auto space-y-4">
        <h1 className="text-3xl font-black pt-2">אוצר מילים</h1>

        {/* Search */}
        <VocabularySearchBar defaultValue={q} />

        {/* Category tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {categories.map((c) => {
            const isActive = c === activeCat;
            return (
              <a key={c} href={linkFor({ cat: c })}>
                <span
                  className={cn(
                    "inline-block px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors cursor-pointer",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/70"
                  )}
                >
                  {c === "all" ? "הכל" : c}
                </span>
              </a>
            );
          })}
        </div>

        {/* Chapter tabs */}
        {chapters.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {["all", ...chapters.map(String)].map((ch) => {
              const isActive = ch === activeChapter;
              return (
                <a key={ch} href={linkFor({ chapter: ch })}>
                  <span
                    className={cn(
                      "inline-block px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors cursor-pointer border",
                      isActive
                        ? "bg-foreground text-background border-foreground"
                        : "bg-transparent text-muted-foreground border-border hover:bg-muted/60"
                    )}
                  >
                    {ch === "all" ? "כל הפרקים" : `פרק ${ch}`}
                  </span>
                </a>
              );
            })}
          </div>
        )}

        {/* Word count */}
        <p className="text-xs text-muted-foreground">
          {q ? `נמצאו ${words.length} מילים` : `${words.length} מילים`}
        </p>

        {/* Results */}
        {words.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>לא נמצאו מילים{q ? ` עבור "${q}"` : ""}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {words.map((word) => (
              <div
                key={word.id}
                className="rounded-2xl border border-border bg-card p-4 space-y-2 shadow-[var(--shadow-card)]"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5 flex-1">
                    <p className="text-2xl font-bold" dir="rtl">
                      {word.hebrew_phonetic}
                    </p>
                    {word.transliteration && (
                      <p className="text-sm text-muted-foreground italic" dir="ltr">
                        {word.transliteration}
                      </p>
                    )}
                  </div>
                  {word.recording_path && (
                    <div className="shrink-0">
                      <AudioPlayer filePath={word.recording_path} />
                    </div>
                  )}
                </div>

                <p className="text-base font-semibold">{word.hebrew_translation}</p>

                {word.inflections && Object.keys(word.inflections).length > 0 && (
                  <details className="text-sm text-muted-foreground">
                    <summary className="cursor-pointer font-medium text-primary text-xs">
                      גזרות
                    </summary>
                    <div className="mt-2 space-y-0.5 border-t border-border pt-2">
                      {Object.entries(word.inflections as Record<string, string>).map(
                        ([k, v]) => (
                          <p key={k}>
                            <span className="font-medium">{k}:</span>{" "}
                            <span dir="rtl">{v}</span>
                          </p>
                        )
                      )}
                    </div>
                  </details>
                )}

                <div className="flex flex-wrap items-center gap-1.5">
                  {word.category && (
                    <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                      {CATEGORY_LABELS[word.category as VocabularyCategory] ?? word.category}
                    </span>
                  )}
                  {word.chapter != null && (
                    <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-muted/60 text-muted-foreground">
                      פרק {word.chapter}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </StudentShell>
  );
}
