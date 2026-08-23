import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

export async function GET() {
  const worksheet = XLSX.utils.aoa_to_sheet([
    ["שם מלא", "אימייל", "סיסמה"],
    ["ישראל ישראלי", "israel@idf.il", "Aa123456"],
  ]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "חניכים");

  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="chanichim_import_example.xlsx"',
    },
  });
}
