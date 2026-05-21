export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, FileText, MessageSquare, Bell, Brain } from "lucide-react";

export default async function AdminDashboard() {
  const supabase = await createClient();

  const [
    { count: studentCount },
    { count: sessionCount },
    { data: recentSubmissions },
    { count: examCount },
  ] = await Promise.all([
    supabase
      .from("users")
      .select("*", { count: "exact", head: true })
      .eq("role", "student"),
    supabase
      .from("ai_sessions")
      .select("*", { count: "exact", head: true }),
    supabase
      .from("exam_submissions")
      .select("id, submitted_at, users(name), exams(name)")
      .order("submitted_at", { ascending: false })
      .limit(10),
    supabase
      .from("exams")
      .select("*", { count: "exact", head: true }),
  ]);

  const stats = [
    {
      label: "חניכים פעילים",
      value: studentCount ?? 0,
      icon: Users,
      iconClass: "text-blue-600",
      bgClass: "bg-blue-50",
    },
    {
      label: "מבחנים",
      value: examCount ?? 0,
      icon: FileText,
      iconClass: "text-orange-600",
      bgClass: "bg-orange-50",
    },
    {
      label: "שיחות AI",
      value: sessionCount ?? 0,
      icon: Brain,
      iconClass: "text-purple-600",
      bgClass: "bg-purple-50",
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">לוח בקרה</h1>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map(({ label, value, icon: Icon, iconClass, bgClass }) => (
          <Card key={label}>
            <CardContent className="p-5 flex items-center gap-4">
              <div className={`p-2.5 ${bgClass} rounded-lg shrink-0`}>
                <Icon className={`size-5 ${iconClass}`} />
              </div>
              <div>
                <p className="text-2xl font-bold">{value}</p>
                <p className="text-sm text-muted-foreground">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent submissions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="size-4" />
            הגשות אחרונות
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {!recentSubmissions || recentSubmissions.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">אין הגשות עדיין</p>
          ) : (
            <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="p-3 text-start font-medium">חניך</th>
                  <th className="p-3 text-start font-medium">מבחן</th>
                  <th className="p-3 text-start font-medium">תאריך</th>
                </tr>
              </thead>
              <tbody>
                {recentSubmissions.map((sub) => (
                  <tr key={sub.id} className="border-b last:border-0">
                    <td className="p-3">
                      {(sub.users as unknown as { name: string } | null)?.name ?? "—"}
                    </td>
                    <td className="p-3">
                      {(sub.exams as unknown as { name: string } | null)?.name ?? "—"}
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {new Date(sub.submitted_at).toLocaleString("he-IL", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
