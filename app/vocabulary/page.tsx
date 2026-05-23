export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { StudentShell } from "@/components/student-shell";
import { CATEGORY_LABELS, type VocabularyCategory } from "@/types";
import { AudioPlayer } from "./audio-player";
import { VocabularySearchBar } from "./search-bar";
import { cn } from "@/lib/utils";

interface PageProps {
  searchParams: Promise<{ q?: string; cat?: string }>;
}

const CATEGORY_COLORS: Record<string, string> = {
  all: "bg-primary text-primary-foreground",
  security: "bg-primary text-primary-foreground",
  daily: "bg-teal-500 text-white",
  checkpoint: "bg-indigo-500 text-white",
  interrogation: "bg-amber-500 text-white",
  other: "bg-muted text-muted-foreground",
};

export default async function VocabularyPage({ searchParams }: PageProps) {
  const { q, cat } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("vocabulary")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  if (q?.trim()) {
    query = query.or(
      `arabic_text.ilike.%${q}%,hebrew_translation.ilike.%${q}%,transliteration.ilike.%${q}%`
    );
  }

  if (cat && cat !== "all") {
    query = query.eq("category", cat);
  }

  const { data: wordsData } = await query;
  const words = wordsData ?? [];

  const categories = ["all", ...Object.keys(CATEGORY_LABELS)] as const;
  const activeCat = cat && cat !== "all" ? cat : "all";

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
              <a key={c} href={`/vocabulary?${q ? `q=${q}&` : ""}cat=${c}`}>
                <span
                  className={cn(
                    "inline-block px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors cursor-pointer",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/70"
                  )}
                >
                  {c === "all" ? "הכל" : CATEGORY_LABELS[c as VocabularyCategory]}
                </span>
              </a>
            );
          })}
        </div>

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
                    <p
                      className="text-2xl font-bold"
                      dir="rtl"
                      lang="ar"
                      style={{ fontFamily: "var(--font-noto-arabic)" }}
                    >
                      {word.arabic_text}
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
                            <span
                              dir="rtl"
                              lang="ar"
                              style={{ fontFamily: "var(--font-noto-arabic)" }}
                            >
                              {v}
                            </span>
                          </p>
                        )
                      )}
                    </div>
                  </details>
                )}

                {word.category && (
                  <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                    {CATEGORY_LABELS[word.category as VocabularyCategory]}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </StudentShell>
  );
}
