import { createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

const SESSION_TYPE_LABELS: Record<string, string> = {
  scenario: "תרחיש",
  free_practice: "תרגול חופשי",
  free_conversation: "שיחה חופשית",
};

export async function GET() {
  const adminSupabase = createAdminClient();

  const { data, error } = await adminSupabase
    .from("ai_sessions")
    .select("session_type, started_at, feedback_text, users(name), scenarios(name)")
    .order("started_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data ?? []) as unknown as Array<{
    session_type: string | null;
    started_at: string;
    feedback_text: string | null;
    users: { name: string } | null;
    scenarios: { name: string } | null;
  }>;

  const worksheet = XLSX.utils.aoa_to_sheet([
    ["שם חניך", "סוג שיחה", "תרחיש", "תאריך", "פידבק"],
    ...rows.map((r) => [
      r.users?.name ?? "",
      r.session_type ? (SESSION_TYPE_LABELS[r.session_type] ?? r.session_type) : "",
      r.scenarios?.name ?? "",
      new Date(r.started_at).toLocaleDateString("he-IL"),
      r.feedback_text ?? "",
    ]),
  ]);
  worksheet["!cols"] = [{ wch: 20 }, { wch: 16 }, { wch: 20 }, { wch: 12 }, { wch: 80 }];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "פידבקים");

  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="feedback_export.xlsx"',
    },
  });
}
