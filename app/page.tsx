export const dynamic = "force-dynamic";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { StudentShell } from "@/components/student-shell";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { BookOpen, Search, MessageSquare, FileText, Calendar, Trophy } from "lucide-react";

type LeaderboardRow = {
  user_id: string;
  name: string;
  total_points: number;
  rank: number;
};

const RANK_MEDALS = ["🥇", "🥈", "🥉"];

export default async function StudentHome() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const name = (user?.user_metadata?.name as string) ?? "חניך";
  const adminSupabase = createAdminClient();

  // Run all fetches in parallel
  const [
    { data: upcomingExam },
    { data: credits },
    { data: accessData },
  ] = await Promise.all([
    supabase
      .from("exams")
      .select("name, due_date")
      .gte("due_date", new Date().toISOString().split("T")[0])
      .order("due_date", { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("ai_credits")
      .select("monthly_limit, current_month_usage")
      .eq("user_id", user!.id)
      .maybeSingle(),
    adminSupabase
      .from("user_course_access")
      .select("course_id")
      .eq("user_id", user!.id)
      .limit(1)
      .maybeSingle(),
  ]);

  const creditsLeft = credits
    ? credits.monthly_limit - credits.current_month_usage
    : null;

  const courseId = accessData?.course_id ?? null;

  // Fetch leaderboard top 3 + my rank (only if leaderboard is visible for the course)
  let top3: LeaderboardRow[] = [];
  let myEntry: LeaderboardRow | undefined;

  if (courseId) {
    const [{ data: courseData }, { data: lbData }] = await Promise.all([
      adminSupabase
        .from("courses")
        .select("show_leaderboard")
        .eq("id", courseId)
        .maybeSingle(),
      adminSupabase.rpc("get_leaderboard", {
        p_course_id: courseId,
        p_period: "all",
      }),
    ]);

    if (courseData?.show_leaderboard !== false) {
      const rows: LeaderboardRow[] = (lbData ?? []) as LeaderboardRow[];
      top3 = rows.slice(0, 3);
      myEntry = rows.find((r) => r.user_id === user!.id);
    }
  }

  const quickActions = [
    { href: "/handbook", label: "חוברת לימוד", icon: BookOpen },
    { href: "/vocabulary", label: "אוצר מילים", icon: Search },
    { href: "/ai-practice", label: "תרגול AI", icon: MessageSquare },
    { href: "/exams", label: "מבחנים וציונים", icon: FileText },
  ];

  return (
    <StudentShell>
      <div className="p-5 space-y-6 max-w-lg mx-auto">
        {/* Greeting */}
        <div className="pt-2">
          <p className="text-sm text-muted-foreground">שלום,</p>
          <h1 className="text-2xl font-bold mt-0.5">{name}</h1>
        </div>

        <div className="space-y-3">
          {/* Upcoming exam */}
          {upcomingExam && (
            <Card>
              <CardContent className="p-4 flex items-start gap-3">
                <Calendar className="size-4 text-muted-foreground mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground font-medium">מבחן קרוב</p>
                  <p className="font-semibold text-sm mt-0.5 truncate">{upcomingExam.name}</p>
                  {upcomingExam.due_date && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(upcomingExam.due_date).toLocaleDateString("he-IL")}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* AI Credits */}
          {creditsLeft !== null && (
            <Card>
              <CardContent className="p-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">שיחות AI נותרו החודש</p>
                  <p className="font-semibold text-sm mt-0.5">
                    {creditsLeft} מתוך {credits?.monthly_limit}
                  </p>
                </div>
                <MessageSquare className="size-5 text-muted-foreground shrink-0" />
              </CardContent>
            </Card>
          )}

          {/* Mini leaderboard */}
          {top3.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Trophy className="size-4 text-muted-foreground" />
                    <p className="text-sm font-semibold">לוח שיאים</p>
                  </div>
                  {myEntry && (
                    <p className="text-xs text-muted-foreground">
                      #{myEntry.rank} · {myEntry.total_points} נק׳
                    </p>
                  )}
                </div>
                <ul className="space-y-2.5 divide-y divide-border">
                  {top3.map((row) => (
                    <li key={row.user_id} className="flex items-center justify-between pt-2 first:pt-0">
                      <div className="flex items-center gap-2.5">
                        <span className="text-base leading-none w-6 text-center">
                          {RANK_MEDALS[row.rank - 1] ?? `#${row.rank}`}
                        </span>
                        <span className={`text-sm ${row.user_id === user!.id ? "font-semibold" : "text-muted-foreground"}`}>
                          {row.name}
                          {row.user_id === user!.id && (
                            <span className="ms-1 text-xs font-normal text-muted-foreground">(אתה)</span>
                          )}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {row.total_points.toLocaleString("he-IL")} נק׳
                      </span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/leaderboard"
                  className="mt-3 block text-xs text-muted-foreground hover:text-foreground transition-colors font-medium"
                >
                  לוח שיאים מלא ←
                </Link>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Quick actions */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">גישה מהירה</p>
          <div className="grid grid-cols-2 gap-2.5">
            {quickActions.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href}>
                <Card className="hover:bg-muted/40 transition-colors cursor-pointer active:scale-[0.98]">
                  <CardContent className="p-4 flex items-center gap-3">
                    <Icon className="size-5 text-muted-foreground shrink-0" />
                    <span className="text-sm font-medium leading-tight">{label}</span>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </StudentShell>
  );
}
