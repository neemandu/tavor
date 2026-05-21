export const dynamic = "force-dynamic";

import { createAdminClient } from "@/lib/supabase/server";
import { AiCreditsTable } from "./ai-credits-table";
import { Settings } from "lucide-react";

type StudentCredit = {
  id: string;
  name: string;
  monthly_limit: number;
  current_month_usage: number;
};

export default async function AdminSettingsPage() {
  const adminSupabase = createAdminClient();

  // Fetch all students with their AI credit info
  const { data: usersData } = await adminSupabase
    .from("users")
    .select("id, name")
    .eq("role", "student")
    .order("name");

  const users = usersData ?? [];

  // Fetch ai_credits for those users
  const { data: creditsData } = await adminSupabase
    .from("ai_credits")
    .select("user_id, monthly_limit, current_month_usage");

  const creditsMap = new Map(
    (creditsData ?? []).map((c) => [
      c.user_id as string,
      { monthly_limit: c.monthly_limit as number, current_month_usage: c.current_month_usage as number },
    ])
  );

  const students: StudentCredit[] = users.map((u) => {
    const credit = creditsMap.get(u.id as string);
    return {
      id: u.id as string,
      name: u.name as string,
      monthly_limit: credit?.monthly_limit ?? 20,
      current_month_usage: credit?.current_month_usage ?? 0,
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Settings className="size-6" />
        <h1 className="text-2xl font-bold">הגדרות מערכת</h1>
      </div>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">מכסות AI לחניכים</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            קבע את מספר שיחות ה-AI המרבי לכל חניך בחודש
          </p>
        </div>
        <AiCreditsTable students={students} />
      </section>
    </div>
  );
}
