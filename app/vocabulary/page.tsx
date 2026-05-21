export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { StudentShell } from "@/components/student-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CATEGORY_LABELS, type VocabularyCategory } from "@/types";
import { AudioPlayer } from "./audio-player";
import { VocabularySearchBar } from "./search-bar";

interface PageProps {
  searchParams: Promise<{ q?: string; cat?: string }>;
}

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

  return (
    <StudentShell>
      <div className="p-4 max-w-lg mx-auto space-y-4">
        <h1 className="text-xl font-bold pt-2">אוצר מילים</h1>

        {/* Search */}
        <VocabularySearchBar defaultValue={q} />

        {/* Category filter */}
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {categories.map((c) => (
            <a key={c} href={`/vocabulary?${q ? `q=${q}&` : ""}cat=${c}`}>
              <Badge
                variant={cat === c || (!cat && c === "all") ? "default" : "outline"}
                className="cursor-pointer whitespace-nowrap"
              >
                {c === "all" ? "הכל" : CATEGORY_LABELS[c as VocabularyCategory]}
              </Badge>
            </a>
          ))}
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
              <Card key={word.id}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5">
                      <p
                        className="text-xl font-semibold"
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
                      <AudioPlayer filePath={word.recording_path} />
                    )}
                  </div>

                  <p className="text-base font-medium">{word.hebrew_translation}</p>

                  {word.inflections && Object.keys(word.inflections).length > 0 && (
                    <div className="text-sm text-muted-foreground space-y-0.5 border-t pt-2">
                      {Object.entries(word.inflections as Record<string, string>).map(
                        ([k, v]) => (
                          <p key={k}>
                            <span className="font-medium">{k}:</span>{" "}
                            <span dir="rtl" lang="ar" style={{ fontFamily: "var(--font-noto-arabic)" }}>
                              {v}
                            </span>
                          </p>
                        )
                      )}
                    </div>
                  )}

                  {word.category && (
                    <Badge variant="outline" className="text-xs">
                      {CATEGORY_LABELS[word.category as VocabularyCategory]}
                    </Badge>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </StudentShell>
  );
}
