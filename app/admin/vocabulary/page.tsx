export const dynamic = "force-dynamic";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AddWordForm } from "./add-word-form";
import { ExcelImportButton } from "./excel-import";
import { HandbookUpload } from "./handbook-upload";
import { VocabularyTable } from "./vocabulary-table";
import { Search } from "lucide-react";

export default async function AdminVocabularyPage() {
  const supabase = await createClient();

  const { data: wordsData } = await supabase
    .from("vocabulary")
    .select("id, arabic_text, transliteration, hebrew_translation, category, recording_path, inflections")
    .order("created_at", { ascending: false })
    .limit(100);
  const words = wordsData ?? [];

  const { data: coursesData } = await supabase
    .from("courses")
    .select("id, name")
    .eq("is_active", true);
  const courses = (coursesData ?? []) as { id: string; name: string }[];

  const adminSupabase = createAdminClient();
  const { data: handbooksData } = await adminSupabase
    .from("handbooks")
    .select("course_id, file_path, file_name");

  const handbooks: { courseId: string; fileName: string; signedUrl: string }[] = [];
  for (const h of handbooksData ?? []) {
    const { data } = await adminSupabase.storage
      .from("handbooks")
      .createSignedUrl(h.file_path, 60 * 60);
    if (data?.signedUrl) {
      handbooks.push({ courseId: h.course_id, fileName: h.file_name, signedUrl: data.signedUrl });
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">ניהול תוכן</h1>

      <HandbookUpload courses={courses} handbooks={handbooks} />

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Search className="size-4" />
              אוצר מילים
            </CardTitle>
            <ExcelImportButton />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <AddWordForm />

          <div className="mt-4">
            <p className="text-sm text-muted-foreground mb-3">{words.length} מילים</p>
            <VocabularyTable words={words} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
