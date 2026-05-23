export const dynamic = "force-dynamic";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { StudentShell } from "@/components/student-shell";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

type LeaderboardRow = {
  user_id: string;
  name: string;
  total_points: number;
  rank: number;
};

const PERIODS = [
  { key: "week", label: "השבוע" },
  { key: "month", label: "החודש" },
  { key: "all", label: "כל הזמן" },
] as const;

const PODIUM_MEDALS = ["🥇", "🥈", "🥉"];

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const params = await searchParams;
  const period =
    (["week", "month", "all"] as string[]).includes(params.period ?? "")
      ? (params.period as string)
      : "all";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <StudentShell>
        <div className="p-4">
          <p className="text-muted-foreground">יש להתחבר כדי לצפות בלוח השיאים</p>
        </div>
      </StudentShell>
    );
  }

  const adminSupabase = createAdminClient();

  // Get current user's course_id
  const { data: accessData } = await adminSupabase
    .from("user_course_access")
    .select("course_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  const courseId = accessData?.course_id ?? null;

  // Check if leaderboard is visible for this course
  const { data: courseData } = await adminSupabase
    .from("courses")
    .select("show_leaderboard")
    .eq("id", courseId ?? "")
    .maybeSingle();

  if (courseId && courseData?.show_leaderboard === false) {
    return (
      <StudentShell>
        <div className="p-4 max-w-lg mx-auto pt-8">
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              לוח השיאים מוסתר עבור קורס זה
            </CardContent>
          </Card>
        </div>
      </StudentShell>
    );
  }

  // Call leaderboard RPC
  const { data: rawRows } = await adminSupabase.rpc("get_leaderboard", {
    p_course_id: courseId,
    p_period: period,
  });

  const rows: LeaderboardRow[] = (rawRows ?? []) as LeaderboardRow[];

  // Find current user's entry
  const myEntry = rows.find((r) => r.user_id === user.id);

  const top3 = rows.slice(0, 3);
  // Podium order: 2nd (left) | 1st (center) | 3rd (right)
  const podiumOrder = [top3[1], top3[0], top3[2]].filter(Boolean) as LeaderboardRow[];

  return (
    <StudentShell>
      <div className="p-4 max-w-lg mx-auto space-y-5">
        {/* Header */}
        <div className="pt-4 flex items-center gap-2">
          <Trophy className="size-7 text-amber-500" />
          <div>
            <h1 className="text-3xl font-black">לוח המצטיינים</h1>
            {myEntry && (
              <p className="text-sm text-muted-foreground">
                הדירוג שלך: #{myEntry.rank} · {myEntry.total_points} נקודות
              </p>
            )}
          </div>
        </div>

        {/* Period tabs */}
        <div className="flex gap-2 flex-wrap">
          {PERIODS.map(({ key, label }) => (
            <Link
              key={key}
              href={`/leaderboard?period=${key}`}
              className={cn(
                "px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
                period === key
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/70"
              )}
            >
              {label}
            </Link>
          ))}
        </div>

        {rows.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground space-y-2">
              <Trophy className="size-10 mx-auto opacity-30" />
              <p className="font-medium">אין נתונים עדיין</p>
              <p className="text-sm">צבור נקודות על ידי תרגול AI, לימוד אותיות ומבחנים</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Podium */}
            {top3.length > 0 && (
              <div className="flex items-end justify-center gap-4 pt-2 pb-6">
                {podiumOrder.map((entry) => {
                  const isFirst = entry.rank === 1;
                  const rankIndex = entry.rank - 1;
                  const heights = ["h-24", "h-32", "h-20"];
                  const barHeight = heights[rankIndex] ?? "h-20";
                  const podiumColors = [
                    "bg-yellow-400/80",
                    "bg-slate-300/80",
                    "bg-amber-400/60",
                  ];
                  const barColor = podiumColors[rankIndex] ?? "bg-muted";

                  return (
                    <div key={entry.user_id} className="flex flex-col items-center gap-1.5">
                      <div
                        className={cn(
                          "w-12 h-12 rounded-full flex items-center justify-center text-lg font-black border-2",
                          isFirst
                            ? "bg-yellow-100 border-yellow-400 text-yellow-700"
                            : "bg-muted border-border text-foreground"
                        )}
                      >
                        {entry.name.charAt(0)}
                      </div>
                      <p className="text-xs font-semibold text-center max-w-[72px] truncate">
                        {entry.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {entry.total_points.toLocaleString("he-IL")}
                      </p>
                      <div
                        className={cn(
                          "w-20 rounded-t-xl flex items-end justify-center pb-1.5",
                          barHeight,
                          barColor,
                          isFirst && "shadow-[0_0_20px_oklch(80%_0.18_85/0.4)]"
                        )}
                      >
                        <span className="text-base font-black text-white/80">
                          #{entry.rank}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Full table */}
            <Card>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40">
                      <th className="p-3 text-start font-medium w-12">דירוג</th>
                      <th className="p-3 text-start font-medium">שם</th>
                      <th className="p-3 text-end font-medium">נקודות</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => {
                      const isMe = row.user_id === user.id;
                      return (
                        <tr
                          key={row.user_id}
                          className={cn(
                            "border-b last:border-0",
                            isMe && "bg-primary/10 font-semibold"
                          )}
                        >
                          <td className="p-3">
                            {row.rank <= 3 ? (
                              <span>{PODIUM_MEDALS[row.rank - 1]}</span>
                            ) : (
                              <span className="text-muted-foreground">#{row.rank}</span>
                            )}
                          </td>
                          <td className="p-3">
                            <span className={isMe ? "text-primary" : ""}>
                              {row.name}
                            </span>
                            {isMe && (
                              <span className="me-2 text-xs text-primary font-normal">(אתה)</span>
                            )}
                          </td>
                          <td className="p-3 text-end">
                            <span
                              className={cn(
                                "text-sm font-mono",
                                isMe ? "text-primary font-bold" : "text-muted-foreground"
                              )}
                            >
                              {row.total_points.toLocaleString("he-IL")}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </StudentShell>
  );
}
