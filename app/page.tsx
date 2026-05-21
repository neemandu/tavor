export const dynamic = "force-dynamic";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { StudentShell } from "@/components/student-shell";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import {
  BookOpen,
  Search,
  MessageSquare,
  FileText,
  Calendar,
  Trophy,
} from "lucide-react";

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
    { href: "/handbook", label: "חוברת לימוד", icon: BookOpen, color: "text-blue-600" },
    { href: "/vocabulary", label: "אוצר מילים", icon: Search, color: "text-green-600" },
    { href: "/ai-practice", label: "תרגול AI", icon: MessageSquare, color: "text-purple-600" },
    { href: "/exams", label: "מבחנים וציונים", icon: FileText, color: "text-orange-600" },
  ];

  return (
    <StudentShell>
      <div className="p-4 space-y-5 max-w-lg mx-auto">
        <div className="pt-4">
          <h1 className="text-2xl font-bold">שלום, {name}</h1>
          <p className="text-muted-foreground text-sm mt-1">ברוך הבא לאולפן ערבית תבור</p>
        </div>

        <div className="space-y-3">
          {upcomingExam && (
            <Card className="border-orange-200 bg-orange-50">
              <CardContent className="p-3 flex items-start gap-3">
                <Calendar className="size-5 text-orange-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-orange-600 font-medium">מבחן קרוב</p>
                  <p className="font-semibold text-sm">{upcomingExam.name}</p>
                  {upcomingExam.due_date && (
                    <p className="text-xs text-muted-foreground">
                      {new Date(upcomingExam.due_date).toLocaleDateString("he-IL")}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {creditsLeft !== null && (
            <Card>
              <CardContent className="p-3 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">שיחות AI נותרו החודש</p>
                  <p className="font-semibold text-sm">
                    {creditsLeft} מתוך {credits?.monthly_limit}
                  </p>
                </div>
                <MessageSquare className="size-8 text-purple-400 opacity-60" />
              </CardContent>
            </Card>
          )}

          {/* Mini leaderboard */}
          {top3.length > 0 && (
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <Trophy className="size-4 text-yellow-500" />
                    <p className="text-sm font-semibold">לוח שיאים</p>
                  </div>
                  {myEntry && (
                    <p className="text-xs text-muted-foreground">
                      הדירוג שלך: #{myEntry.rank} · {myEntry.total_points} נק׳
                    </p>
                  )}
                </div>
                <ul className="space-y-1.5">
                  {top3.map((row) => (
                    <li
                      key={row.user_id}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-base leading-none">
                          {RANK_MEDALS[row.rank - 1] ?? `#${row.rank}`}
                        </span>
                        <span
                          className={`text-sm ${
                            row.user_id === user!.id ? "font-semibold text-primary" : ""
                          }`}
                        >
                          {row.name}
                          {row.user_id === user!.id && (
                            <span className="mr-1 text-xs font-normal text-muted-foreground">
                              (אתה)
                            </span>
                          )}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {row.total_points.toLocaleString("he-IL")} נק׳
                      </span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/leaderboard"
                  className="mt-2 block text-xs text-primary text-center hover:underline"
                >
                  ראה לוח שיאים מלא ←
                </Link>
              </CardContent>
            </Card>
          )}
        </div>

        <div>
          <h2 className="text-sm font-semibold text-muted-foreground mb-3">גישה מהירה</h2>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map(({ href, label, icon: Icon, color }) => (
              <Link key={href} href={href}>
                <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                  <CardContent className="p-5 flex flex-col items-center gap-2.5">
                    <Icon className={`size-8 ${color}`} />
                    <span className="text-sm font-medium text-center">{label}</span>
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
