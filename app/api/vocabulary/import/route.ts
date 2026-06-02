import { createClient, createAdminClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { mapSemanticField } from "@/lib/vocab-categories";

// Column aliases. The headline word is the Arabic pronunciation in Hebrew
// letters ("word"); "translation" is the Hebrew meaning.
const EXPECTED_COLUMNS = {
  word: ["word", "מילה", "hebrew_phonetic", "מילה עברית"],
  translation: ["translation", "תרגום", "hebrew", "עברית", "hebrew_translation"],
  semantic_field: ["semantic_field", "תחום", "שדה סמנטי", "category", "קטגוריה"],
  chapter: ["chapter", "פרק", "יחידה"],
};

const ZERO_UUID = "00000000-0000-0000-0000-000000000000";

function detectColumn(headers: string[], candidates: string[]): number {
  return headers.findIndex((h) =>
    candidates.some((c) => h.toLowerCase().trim() === c.toLowerCase())
  );
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.user_metadata?.role !== "admin") {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const replace = formData.get("replace") === "true";
  if (!file) {
    return NextResponse.json({ error: "קובץ לא נמצא" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<string[]>(sheet, {
    header: 1,
    defval: "",
  });

  if (rows.length < 2) {
    return NextResponse.json({ error: "הקובץ ריק" }, { status: 400 });
  }

  const headers = rows[0].map(String);
  const wordIdx = detectColumn(headers, EXPECTED_COLUMNS.word);
  const translationIdx = detectColumn(headers, EXPECTED_COLUMNS.translation);
  const fieldIdx = detectColumn(headers, EXPECTED_COLUMNS.semantic_field);
  const chapterIdx = detectColumn(headers, EXPECTED_COLUMNS.chapter);

  if (wordIdx === -1 || translationIdx === -1) {
    return NextResponse.json(
      {
        error:
          'עמודות חובה לא נמצאו. נדרשות עמודות "word" ו-"translation" (או "מילה" ו-"תרגום")',
      },
      { status: 400 }
    );
  }

  const records = rows
    .slice(1)
    .filter(
      (row) =>
        row[wordIdx]?.toString().trim() &&
        row[translationIdx]?.toString().trim()
    )
    .map((row) => {
      const rawField =
        fieldIdx >= 0 ? row[fieldIdx]?.toString().trim() || null : null;
      const chapterRaw =
        chapterIdx >= 0 ? row[chapterIdx]?.toString().trim() : "";
      const chapter = chapterRaw && /^\d+$/.test(chapterRaw)
        ? parseInt(chapterRaw, 10)
        : null;
      return {
        hebrew_phonetic: row[wordIdx].toString().trim(),
        hebrew_translation: row[translationIdx].toString().trim(),
        semantic_field: rawField,
        category: mapSemanticField(rawField),
        chapter,
        created_by: user.id,
      };
    });

  if (records.length === 0) {
    return NextResponse.json({ error: "לא נמצאו שורות תקינות" }, { status: 400 });
  }

  const adminSupabase = createAdminClient();

  if (replace) {
    const { error: delError } = await adminSupabase
      .from("vocabulary")
      .delete()
      .neq("id", ZERO_UUID);
    if (delError) {
      return NextResponse.json({ error: delError.message }, { status: 500 });
    }
  }

  // Insert in batches to stay within request limits.
  const BATCH = 500;
  for (let i = 0; i < records.length; i += BATCH) {
    const { error } = await adminSupabase
      .from("vocabulary")
      .insert(records.slice(i, i + BATCH));
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ imported: records.length });
}
