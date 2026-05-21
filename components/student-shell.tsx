"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, MessageSquare, FileText, Grid2x2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";

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
      {/* Top header */}
      <header className="fixed top-0 inset-x-0 z-50 h-14 flex items-center justify-between px-5 bg-background border-b border-border">
        <ThemeToggle />
        <span className="text-sm font-semibold tracking-wide">תבור</span>
      </header>

      <main className="flex-1 overflow-y-auto pt-14 pb-[calc(4rem+env(safe-area-inset-bottom))]">
        {children}
      </main>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 inset-x-0 z-50 bg-background border-t border-border pb-[env(safe-area-inset-bottom)]">
        <div className="grid grid-cols-5 h-16">
          {navItems.map(({ href, label, icon: Icon, exact }) => {
            const isActive = exact ? pathname === href : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 text-[11px] transition-colors",
                  isActive
                    ? "text-foreground font-semibold"
                    : "text-muted-foreground hover:text-foreground font-normal"
                )}
              >
                <Icon className={cn("size-5", isActive ? "stroke-[2.2]" : "stroke-[1.5]")} />
                <span>{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
