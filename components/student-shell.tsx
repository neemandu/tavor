"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, MessageSquare, FileText, Grid2x2 } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "בית", icon: Home, exact: true },
  { href: "/vocabulary", label: "מילים", icon: Search },
  { href: "/ai-practice", label: "תרגול", icon: MessageSquare },
  { href: "/exams", label: "מבחנים", icon: FileText },
  { href: "/more", label: "עוד", icon: Grid2x2 },
];

export function StudentShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <main className="flex-1 overflow-y-auto pb-20">{children}</main>

      <nav className="fixed bottom-0 inset-x-0 z-50 bg-background border-t border-border">
        <div className="grid grid-cols-5 h-16">
          {navItems.map(({ href, label, icon: Icon, exact }) => {
            const isActive = exact ? pathname === href : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 text-xs transition-colors",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="size-5" />
                <span>{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
