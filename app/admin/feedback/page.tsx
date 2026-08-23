export const dynamic = "force-dynamic";

import { createAdminClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessagesSquare, FileDown } from "lucide-react";
import { FeedbackTable, type FeedbackRow } from "./feedback-table";

const SESSION_TYPE_LABELS: Record<string, string> = {
  scenario: "תרחיש",
  free_practice: "תרגול חופשי",
  free_conversation: "שיחה חופשית",
};

const DISPLAY_LIMIT = 200;

export default async function AdminFeedbackPage() {
  const adminSupabase = createAdminClient();

  const { data, count } = await adminSupabase
    .from("ai_sessions")
    .select("id, session_type, started_at, feedback_text, users(name), scenarios(name)", { count: "exact" })
    .order("started_at", { ascending: false })
    .limit(DISPLAY_LIMIT);

  const sessions = (data ?? []) as unknown as Array<{
    id: string;
    session_type: string | null;
    started_at: string;
    feedback_text: string | null;
    users: { name: string } | null;
    scenarios: { name: string } | null;
  }>;

  const rows: FeedbackRow[] = sessions.map((s) => ({
    id: s.id,
    studentName: s.users?.name ?? "—",
    sessionTypeLabel: s.session_type ? (SESSION_TYPE_LABELS[s.session_type] ?? s.session_type) : "—",
    scenarioName: s.scenarios?.name ?? null,
    date: new Date(s.started_at).toLocaleDateString("he-IL"),
    feedbackText: s.feedback_text,
  }));

  const total = count ?? rows.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">פידבקים</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {total} שיחות
            {total > DISPLAY_LIMIT ? ` · מוצגות ${DISPLAY_LIMIT} האחרונות` : ""}
          </p>
        </div>
        <a href="/api/admin/feedback/export">
          <Button variant="outline" className="gap-1.5">
            <FileDown className="size-4" />
            ייצוא לאקסל
          </Button>
        </a>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <MessagesSquare className="size-4" />
            כל השיחות והפידבקים
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <FeedbackTable rows={rows} />
        </CardContent>
      </Card>
    </div>
  );
}
