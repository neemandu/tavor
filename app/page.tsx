export const dynamic = "force-dynamic";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { StudentShell } from "@/components/student-shell";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { BookOpen, Search, FileText, Trophy, Mic } from "lucide-react";

type LeaderboardRow = {
  user_id: string;
  name: string;
  total_points: number;
  rank: number;
};

const QUICK_ACTIONS = [
  {
    href: "/ai-practice/conversation",
    label: "שיחה קולית",
    sublabel: "שיחה חופשית 30 דק'",
    icon: Mic,
    bg: "from-primary/90 to-primary",
    textColor: "text-white",
  },
  {
    href: "/vocabulary",
    label: "מילים חדשות",
    sublabel: "אוצר מילים",
    icon: Search,
    bg: "from-teal-500 to-teal-600",
    textColor: "text-white",
  },
  {
    href: "/ai-practice",
    label: "תרחיש",
    sublabel: "תרגול מובנה",
    icon: FileText,
    bg: "from-indigo-500 to-indigo-600",
    textColor: "text-white",
  },
  {
    href: "/leaderboard",
    label: "לוח שיאים",
    sublabel: "דירוג ונקודות",
    icon: Trophy,
    bg: "from-amber-400 to-amber-500",
    textColor: "text-white",
  },
] as const;

export default async function StudentHome() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const name = (user?.user_metadata?.name as string) ?? "חניך";
  const adminSupabase = createAdminClient();

  const [{ data: credits }, { data: accessData }] = await Promise.all([
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

  const courseId = accessData?.course_id ?? null;

  let myEntry: LeaderboardRow | undefined;

  if (courseId) {
    const [{ data: courseData }, { data: lbData }] = await Promise.all([
      adminSupabase
        .from("courses")
        .select("show_leaderboard")
        .eq("id", courseId)
        .maybeSingle(),
      adminSupabase.rpc("get_leaderboard", { p_course_id: courseId, p_period: "all" }),
    ]);

    if (courseData?.show_leaderboard !== false) {
      const rows: LeaderboardRow[] = (lbData ?? []) as LeaderboardRow[];
      myEntry = rows.find((r) => r.user_id === user!.id);
    }
  }

  const creditsLeft = credits
    ? credits.monthly_limit - credits.current_month_usage
    : null;

  return (
    <StudentShell>
      <div className="p-5 space-y-6 max-w-lg mx-auto">
        {/* Greeting */}
        <div className="pt-2">
          <h1 className="text-3xl font-black">שלום, {name}!</h1>
        </div>

        {/* XP + Rank card */}
        {myEntry && (
          <Card className="rounded-2xl border-s-4 border-s-primary shadow-[var(--shadow-card)]">
            <CardContent className="p-5">
              <div className="flex items-center justify-between gap-4">
                <div className="text-center">
                  <p className="text-2xl font-black text-primary">
                    {myEntry.total_points.toLocaleString("he-IL")}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">נקודות XP</p>
                </div>
                <div className="w-px h-10 bg-border" />
                <div className="text-center">
                  <p className="text-2xl font-black">#{myEntry.rank}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">דירוג</p>
                </div>
                {creditsLeft !== null && (
                  <>
                    <div className="w-px h-10 bg-border" />
                    <div className="text-center">
                      <p className="text-2xl font-black">{creditsLeft}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">שיחות נותרו</p>
                    </div>
                  </>
                )}
              </div>
              {myEntry && (
                <div className="mt-4">
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{
                        width: `${Math.min(100, (myEntry.total_points % 100))}%`,
                      }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    עוד {100 - (myEntry.total_points % 100)} נקודות לרמה הבאה
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Quick actions 2x2 */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            גישה מהירה
          </p>
          <div className="grid grid-cols-2 gap-3">
            {QUICK_ACTIONS.map(({ href, label, sublabel, icon: Icon, bg, textColor }) => (
              <Link key={href} href={href}>
                <Card
                  className={`rounded-2xl overflow-hidden hover:opacity-90 transition-opacity active:scale-[0.98] cursor-pointer bg-gradient-to-br ${bg}`}
                >
                  <CardContent className="p-4 space-y-2">
                    <Icon className={`size-8 ${textColor}`} strokeWidth={2} />
                    <div>
                      <p className={`font-bold text-sm leading-tight ${textColor}`}>{label}</p>
                      <p className={`text-xs mt-0.5 ${textColor} opacity-80`}>{sublabel}</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        {/* Handbook link */}
        <Link href="/handbook">
          <Card className="rounded-2xl hover:bg-muted/40 transition-colors cursor-pointer active:scale-[0.98]">
            <CardContent className="p-4 flex items-center gap-3">
              <BookOpen className="size-5 text-primary shrink-0" />
              <div>
                <p className="font-semibold text-sm">חוברת לימוד</p>
                <p className="text-xs text-muted-foreground">חומרי הקורס</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </StudentShell>
  );
}
