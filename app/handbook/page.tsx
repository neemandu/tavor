export const dynamic = "force-dynamic";

import { createAdminClient } from "@/lib/supabase/server";
import { StudentShell } from "@/components/student-shell";
import { Button } from "@/components/ui/button";
import { Download, BookOpen } from "lucide-react";

export default async function HandbookPage() {
  const supabase = createAdminClient();

  // Fetch the most recent handbook (any course – for now we take the latest)
  const { data: handbook } = await supabase
    .from("handbooks")
    .select("id, file_path, file_name, created_at")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let pdfUrl: string | null = null;
  if (handbook?.file_path) {
    const { data } = await supabase.storage
      .from("handbooks")
      .createSignedUrl(handbook.file_path, 60 * 60); // 1 hour
    pdfUrl = data?.signedUrl ?? null;
  }

  return (
    <StudentShell>
      <div className="p-4 max-w-lg mx-auto space-y-4">
        <div className="flex items-center gap-2 pt-2">
          <BookOpen className="size-5" />
          <h1 className="text-xl font-bold">חוברת לימוד</h1>
        </div>

        {!handbook ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground text-center">
            <BookOpen className="size-12 mb-3 opacity-30" />
            <p>עדיין לא הועלתה חוברת לימוד</p>
            <p className="text-sm">פנה למדריך שלך</p>
          </div>
        ) : pdfUrl ? (
          <>
            <div className="flex items-center justify-end">
              <a href={pdfUrl} download={handbook.file_name} target="_blank" rel="noreferrer">
                <Button variant="default" size="sm" className="gap-2">
                  <Download className="size-4" />
                  הורדה
                </Button>
              </a>
            </div>

            <div className="flex flex-col rounded-lg border overflow-hidden">
              <iframe
                src={pdfUrl}
                className="flex-1 w-full rounded-md border-0"
                style={{ minHeight: "70vh" }}
                title="חוברת לימוד"
              />
            </div>
            <p className="text-xs text-muted-foreground text-center py-1">
              אם החוברת לא נטענת,{" "}
              <a href={pdfUrl} target="_blank" rel="noreferrer" className="underline text-primary">
                פתח ישירות
              </a>
            </p>
          </>
        ) : (
          <p className="text-muted-foreground text-sm">שגיאה בטעינת החוברת</p>
        )}
      </div>
    </StudentShell>
  );
}
