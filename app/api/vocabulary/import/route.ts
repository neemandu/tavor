import { createClient, createAdminClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";

const EXPECTED_COLUMNS = {
  arabic: ["arabic", "ערבית", "arabic_text", "عربي"],
  hebrew: ["hebrew", "עברית", "hebrew_translation", "translation"],
  transliteration: ["transliteration", "תעתיק", "phonetic"],
  category: ["category", "קטגוריה"],
};

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
  const arabicIdx = detectColumn(headers, EXPECTED_COLUMNS.arabic);
  const hebrewIdx = detectColumn(headers, EXPECTED_COLUMNS.hebrew);
  const transliterationIdx = detectColumn(headers, EXPECTED_COLUMNS.transliteration);
  const categoryIdx = detectColumn(headers, EXPECTED_COLUMNS.category);

  if (arabicIdx === -1 || hebrewIdx === -1) {
    return NextResponse.json(
      {
        error:
          'עמודות חובה לא נמצאו. נדרשות עמודות "arabic" ו-"hebrew" (או המקבילות בעברית)',
      },
      { status: 400 }
    );
  }

  const validCategories = new Set([
    "security",
    "daily",
    "checkpoint",
    "interrogation",
    "other",
  ]);

  const records = rows
    .slice(1)
    .filter((row) => row[arabicIdx]?.toString().trim() && row[hebrewIdx]?.toString().trim())
    .map((row) => {
      const cat = row[categoryIdx]?.toString().trim().toLowerCase();
      return {
        arabic_text: row[arabicIdx].toString().trim(),
        hebrew_translation: row[hebrewIdx].toString().trim(),
        transliteration: transliterationIdx >= 0 ? row[transliterationIdx]?.toString().trim() || null : null,
        category: cat && validCategories.has(cat) ? cat : null,
        created_by: user.id,
      };
    });

  if (records.length === 0) {
    return NextResponse.json({ error: "לא נמצאו שורות תקינות" }, { status: 400 });
  }

  const adminSupabase = createAdminClient();
  const { error } = await adminSupabase.from("vocabulary").insert(records);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ imported: records.length });
}
