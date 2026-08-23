import { createAdminClient } from "@/lib/supabase/server";
import { createStudent } from "@/lib/admin-students";
import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";

const EXPECTED_COLUMNS = {
  name: ["full_name", "name", "שם מלא", "שם"],
  email: ["email", "אימייל", "מייל"],
  password: ["password", "סיסמה", "סיסמא"],
};

function detectColumn(headers: string[], candidates: string[]): number {
  return headers.findIndex((h) =>
    candidates.some((c) => h.toLowerCase().trim() === c.toLowerCase())
  );
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const courseId = (formData.get("courseId") as string | null) || null;

  if (!file) {
    return NextResponse.json({ error: "קובץ לא נמצא" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: "" });

  if (rows.length < 2) {
    return NextResponse.json({ error: "הקובץ ריק" }, { status: 400 });
  }

  const headers = rows[0].map(String);
  const nameIdx = detectColumn(headers, EXPECTED_COLUMNS.name);
  const emailIdx = detectColumn(headers, EXPECTED_COLUMNS.email);
  const passwordIdx = detectColumn(headers, EXPECTED_COLUMNS.password);

  if (nameIdx === -1 || emailIdx === -1 || passwordIdx === -1) {
    return NextResponse.json(
      { error: 'עמודות חובה לא נמצאו. נדרשות עמודות "שם מלא", "אימייל" ו-"סיסמה"' },
      { status: 400 }
    );
  }

  const dataRows = rows
    .slice(1)
    .map((row, i) => ({ row, rowNumber: i + 2 }))
    .filter(({ row }) => row[nameIdx]?.toString().trim() || row[emailIdx]?.toString().trim());

  if (dataRows.length === 0) {
    return NextResponse.json({ error: "לא נמצאו שורות תקינות" }, { status: 400 });
  }

  const adminSupabase = createAdminClient();
  let imported = 0;
  const skipped: { row: number; reason: string }[] = [];

  for (const { row, rowNumber } of dataRows) {
    const name = row[nameIdx]?.toString().trim();
    const email = row[emailIdx]?.toString().trim();
    const password = row[passwordIdx]?.toString().trim();

    if (!name || !email || !password) {
      skipped.push({ row: rowNumber, reason: "שדות חסרים" });
      continue;
    }

    const result = await createStudent(adminSupabase, { name, email, password, courseId });
    if (result.ok) {
      imported++;
    } else {
      skipped.push({ row: rowNumber, reason: result.error ?? "שגיאה" });
    }
  }

  return NextResponse.json({ imported, skipped });
}
