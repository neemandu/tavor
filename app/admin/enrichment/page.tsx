export const dynamic = "force-dynamic";

import { createAdminClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AddEnrichmentForm } from "./add-enrichment-form";
import { EnrichmentActions } from "./enrichment-actions";

const CATEGORY_LABELS: Record<string, string> = {
  culture: "תרבות",
  geography: "גיאוגרפיה",
  religion: "דת",
  levantine: "לבנטיני",
  other: "אחר",
};

interface EnrichmentItem {
  id: string;
  title: string;
  description: string | null;
  url: string;
  thumbnail_url: string | null;
  category: string | null;
  is_active: boolean;
  created_at: string;
}

export default async function AdminEnrichmentPage() {
  const supabase = createAdminClient();

  const { data: itemsData } = await supabase
    .from("enrichment")
    .select("id, title, description, url, thumbnail_url, category, is_active, created_at")
    .order("created_at", { ascending: false });

  const items = (itemsData ?? []) as EnrichmentItem[];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">ניהול תכני העשרה</h1>

      <AddEnrichmentForm />

      <div className="space-y-3">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">עדיין לא נוספו תכני העשרה</p>
        ) : (
          items.map((item) => (
            <Card key={item.id}>
              <CardContent className="p-4 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{item.title}</p>
                  <p
                    className="text-xs text-muted-foreground truncate mt-0.5"
                    dir="ltr"
                  >
                    {item.url}
                  </p>
                  {item.description && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {item.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    {item.category && (
                      <Badge variant="outline" className="text-xs">
                        {CATEGORY_LABELS[item.category] ?? item.category}
                      </Badge>
                    )}
                    <Badge
                      variant={item.is_active ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {item.is_active ? "פעיל" : "לא פעיל"}
                    </Badge>
                  </div>
                </div>

                <EnrichmentActions itemId={item.id} isActive={item.is_active} />
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
