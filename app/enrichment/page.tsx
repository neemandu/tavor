export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { StudentShell } from "@/components/student-shell";
import { EnrichmentCard, type EnrichmentItem } from "./enrichment-card";
import Link from "next/link";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  { value: "all", label: "כולם" },
  { value: "culture", label: "תרבות" },
  { value: "geography", label: "גיאוגרפיה" },
  { value: "religion", label: "דת" },
  { value: "levantine", label: "לבנטי" },
  { value: "other", label: "אחר" },
] as const;

interface PageProps {
  searchParams: Promise<{ category?: string }>;
}

export default async function EnrichmentPage({ searchParams }: PageProps) {
  const { category } = await searchParams;
  const activeCategory = category && category !== "all" ? category : null;

  const supabase = await createClient();

  let query = supabase
    .from("enrichment")
    .select("id, title, description, url, thumbnail_url, category")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (activeCategory) {
    query = query.eq("category", activeCategory);
  }

  const { data: itemsData } = await query;
  const items = (itemsData ?? []) as EnrichmentItem[];

  const activeCategoryValue = category ?? "all";

  return (
    <StudentShell>
      <div className="p-4 max-w-2xl mx-auto space-y-4">
        <h1 className="text-xl font-bold pt-2">תכני העשרה</h1>

        {/* Category filter tabs */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar" role="tablist">
          {CATEGORIES.map(({ value, label }) => {
            const isActive = activeCategoryValue === value;
            return (
              <Link
                key={value}
                href={`/enrichment?category=${value}`}
                role="tab"
                aria-selected={isActive}
                className={cn(
                  "inline-flex h-8 shrink-0 items-center justify-center rounded-md px-3 py-1 text-sm font-medium whitespace-nowrap transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                {label}
              </Link>
            );
          })}
        </div>

        {/* Enrichment grid */}
        {items.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <p>אין תכני העשרה בקטגוריה זו</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {items.map((item) => (
              <EnrichmentCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>
    </StudentShell>
  );
}
