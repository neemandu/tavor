export const dynamic = "force-dynamic";

import { StudentShell } from "@/components/student-shell";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { BookOpen, PenLine, Globe, Trophy } from "lucide-react";

const items = [
  {
    href: "/handbook",
    icon: BookOpen,
    title: "חוברת לימוד",
    description: "צפה והורד את חוברת הלימוד שלך",
    color: "bg-blue-100 text-blue-600",
  },
  {
    href: "/letters",
    icon: PenLine,
    title: "לימוד אותיות",
    description: "תרגל כתיבת האלפבית הערבי",
    color: "bg-purple-100 text-purple-600",
  },
  {
    href: "/enrichment",
    icon: Globe,
    title: "תכני העשרה",
    description: "סרטונים, מאמרים ותרבות ערבית",
    color: "bg-green-100 text-green-600",
  },
  {
    href: "/leaderboard",
    icon: Trophy,
    title: "לוח שיאים",
    description: "ראה את הדירוג שלך בקורס",
    color: "bg-yellow-100 text-yellow-600",
  },
];

export default function MorePage() {
  return (
    <StudentShell>
      <div className="p-4 max-w-lg mx-auto space-y-5">
        <div className="pt-4">
          <h1 className="text-2xl font-bold">עוד</h1>
          <p className="text-sm text-muted-foreground mt-1">כלים ותכנים נוספים</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {items.map(({ href, icon: Icon, title, description, color }) => (
            <Link key={href} href={href}>
              <Card className="h-full hover:bg-muted/50 transition-colors cursor-pointer">
                <CardContent className="p-5 space-y-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${color}`}>
                    <Icon className="size-5" />
                  </div>
                  <div>
                    <p className="font-bold text-sm">{title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </StudentShell>
  );
}
