export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { StudentShell } from "@/components/student-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ACHIEVEMENTS } from "@/lib/achievements";
import {
  MessageSquare,
  Flame,
  PenLine,
  Globe,
  Star,
  Trophy,
  Award,
  type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  MessageSquare,
  Flame,
  PenLine,
  Globe,
  Star,
  Trophy,
  Award,
};

export default async function AchievementsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const earned = new Map<string, string>();
  if (user) {
    const { data } = await supabase
      .from("user_achievements")
      .select("achievement_id, earned_at")
      .eq("user_id", user.id);

    for (const row of data ?? []) {
      earned.set(row.achievement_id as string, row.earned_at as string);
    }
  }

  const earnedCount = ACHIEVEMENTS.filter((a) => earned.has(a.id)).length;

  return (
    <StudentShell>
      <div className="p-4 max-w-2xl mx-auto space-y-5">
        <div className="pt-2">
          <h1 className="text-xl font-bold">הישגים</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            ארון הגביעים שלך — {earnedCount}/{ACHIEVEMENTS.length}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {ACHIEVEMENTS.map((a) => {
            const Icon = ICONS[a.icon] ?? Award;
            const earnedAt = earned.get(a.id);
            const isEarned = earnedAt !== undefined;

            return (
              <Card
                key={a.id}
                className={isEarned ? "" : "opacity-50"}
              >
                <CardContent className="p-4 space-y-2">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      isEarned
                        ? "bg-amber-100 text-amber-600"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    <Icon className="size-5" />
                  </div>
                  <div>
                    <p className="font-bold text-sm">{a.title_he}</p>
                    {isEarned ? (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        הושג ב-{new Date(earnedAt).toLocaleDateString("he-IL")}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {a.description_he}
                      </p>
                    )}
                  </div>
                  <Badge variant={isEarned ? "default" : "outline"} className="text-[10px]">
                    {isEarned ? "הושג" : "נעול"}
                  </Badge>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </StudentShell>
  );
}
