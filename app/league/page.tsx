export const dynamic = "force-dynamic";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { StudentShell } from "@/components/student-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

type LeagueRow = {
  user_id: string;
  name: string;
  weekly_xp: number;
  rank: number;
  tier_id: number;
  division: number;
};

const PODIUM_MEDALS = ["🥇", "🥈", "🥉"];

export default async function LeaguePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <StudentShell>
        <div className="p-4">
          <p className="text-muted-foreground">יש להתחבר כדי לצפות בליגה</p>
        </div>
      </StudentShell>
    );
  }

  const adminSupabase = createAdminClient();

  // Make sure the viewer is enrolled in the current week (idempotent), then read.
  await adminSupabase.rpc("ensure_league_membership");

  const { data: rawRows, error: lbError } = await adminSupabase.rpc("get_league_board", {
    p_user_id: user.id,
  });
  if (lbError) console.error("get_league_board RPC error:", lbError);

  const rows: LeagueRow[] = (rawRows ?? []) as LeagueRow[];
  const tierId = rows[0]?.tier_id ?? null;

  const [{ data: tier }, { data: championsRaw }] = await Promise.all([
    tierId
      ? adminSupabase
          .from("league_tiers")
          .select("name_he, promote_count, relegate_count")
          .eq("id", tierId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    adminSupabase
      .from("league_results")
      .select("week_start, weekly_xp, user_id, users(name)")
      .eq("outcome", "champion")
      .order("week_start", { ascending: false })
      .limit(10),
  ]);

  const divSize = rows.length;
  const nPromote = tier ? Math.min(tier.promote_count, Math.floor(divSize / 4)) : 0;
  const nRelegate = tier ? Math.min(tier.relegate_count, Math.floor(divSize / 4)) : 0;

  const myEntry = rows.find((r) => r.user_id === user.id);

  const top3 = rows.slice(0, 3);
  // Podium order: 2nd (left) | 1st (center) | 3rd (right)
  const podiumOrder = [top3[1], top3[0], top3[2]].filter(Boolean) as LeagueRow[];

  const champions = (championsRaw ?? []) as unknown as Array<{
    week_start: string;
    weekly_xp: number;
    user_id: string;
    users: { name: string } | null;
  }>;

  return (
    <StudentShell>
      <div className="p-4 max-w-lg mx-auto space-y-5">
        {/* Header */}
        <div className="pt-4 flex items-center gap-2">
          <Shield className="size-7 text-primary" />
          <div>
            <h1 className="text-3xl font-black">
              ליגת {tier?.name_he ?? ""}
            </h1>
            {myEntry ? (
              <p className="text-sm text-muted-foreground">
                המקום שלך השבוע: #{myEntry.rank} · {myEntry.weekly_xp.toLocaleString("he-IL")} נקודות
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">דירוג שבועי</p>
            )}
          </div>
        </div>

        {/* Promote/relegate legend */}
        {(nPromote > 0 || nRelegate > 0) && (
          <div className="flex gap-3 text-xs text-muted-foreground">
            {nPromote > 0 && (
              <span className="flex items-center gap-1">
                <ChevronUp className="size-3.5 text-green-600" />
                {nPromote} ראשונים עולים ליגה
              </span>
            )}
            {nRelegate > 0 && (
              <span className="flex items-center gap-1">
                <ChevronDown className="size-3.5 text-red-600" />
                {nRelegate} אחרונים יורדים ליגה
              </span>
            )}
          </div>
        )}

        {rows.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground space-y-2">
              <Shield className="size-10 mx-auto opacity-30" />
              <p className="font-medium">עדיין לא שובצת לליגה</p>
              <p className="text-sm">צבור נקודות השבוע — השיבוץ מתעדכן בתחילת כל שבוע</p>
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
                        {entry.weekly_xp.toLocaleString("he-IL")}
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

            {/* Full standings */}
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
                      const inPromote = nPromote > 0 && row.rank <= nPromote;
                      const inRelegate =
                        nRelegate > 0 && row.rank > divSize - nRelegate;
                      return (
                        <tr
                          key={row.user_id}
                          className={cn(
                            "border-b last:border-0",
                            inPromote && "bg-green-500/10",
                            inRelegate && "bg-red-500/10",
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
                            <span className={isMe ? "text-primary" : ""}>{row.name}</span>
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
                              {row.weekly_xp.toLocaleString("he-IL")}
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

        {/* Hall of fame */}
        {champions.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-lg font-bold flex items-center gap-1.5">
              🏆 היכל התהילה
            </h2>
            <Card>
              <CardContent className="p-0">
                <ul className="divide-y">
                  {champions.map((c, i) => (
                    <li key={`${c.user_id}-${c.week_start}`} className="p-3 flex items-center gap-3">
                      <span className="text-lg">🥇</span>
                      <div className="flex-1">
                        <p className="font-semibold text-sm">{c.users?.name ?? "—"}</p>
                        <p className="text-xs text-muted-foreground">
                          שבוע {new Date(c.week_start).toLocaleDateString("he-IL")}
                        </p>
                      </div>
                      <Badge variant="secondary" className="text-[10px]">
                        {c.weekly_xp.toLocaleString("he-IL")} {"נק'"}
                      </Badge>
                      {i === 0 && <Badge className="text-[10px]">האחרון</Badge>}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </StudentShell>
  );
}
