"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, BookOpen, Mic, Trophy, Grid2x2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";

type NavItem = {
  href: string;
  label: string;
  icon: React.ElementType;
  exact?: boolean;
  center?: boolean;
};

const navItems: NavItem[] = [
  { href: "/", label: "בית", icon: Home, exact: true },
  { href: "/vocabulary", label: "מילים", icon: BookOpen },
  { href: "/ai-practice", label: "תרגול", icon: Mic, center: true },
  { href: "/leaderboard", label: "דירוג", icon: Trophy },
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

      <main className="flex-1 overflow-y-auto pt-14 pb-[calc(4.5rem+env(safe-area-inset-bottom))]">
        {children}
      </main>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 inset-x-0 z-50 bg-background border-t border-border pb-[env(safe-area-inset-bottom)]">
        <div className="grid grid-cols-5 h-16 items-end pb-2">
          {navItems.map(({ href, label, icon: Icon, exact, center }) => {
            const isActive = exact ? pathname === href : pathname.startsWith(href);

            if (center) {
              return (
                <Link
                  key={href}
                  href={href}
                  className="flex flex-col items-center justify-end gap-1 -mt-4"
                >
                  <div
                    className={cn(
                      "w-14 h-14 rounded-full flex items-center justify-center shadow-[0_8px_32px_oklch(0%_0_0/0.12)]",
                      isActive
                        ? "bg-primary shadow-[0_0_20px_oklch(65%_0.22_40/0.4)]"
                        : "bg-primary"
                    )}
                  >
                    <Icon className="size-6 text-primary-foreground" strokeWidth={2.5} />
                  </div>
                  <span
                    className={cn(
                      "text-[10px] font-semibold",
                      isActive ? "text-primary" : "text-muted-foreground"
                    )}
                  >
                    {label}
                  </span>
                </Link>
              );
            }

            return (
              <Link
                key={href}
                href={href}
                className="flex flex-col items-center justify-end gap-1 pb-1"
              >
                <div className="relative">
                  <Icon
                    className={cn(
                      "size-5 transition-colors",
                      isActive ? "text-primary" : "text-muted-foreground"
                    )}
                    strokeWidth={isActive ? 2.5 : 1.8}
                  />
                  {isActive && (
                    <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
                  )}
                </div>
                <span
                  className={cn(
                    "text-[10px] transition-colors",
                    isActive ? "text-primary font-bold" : "text-muted-foreground font-normal"
                  )}
                >
                  {label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
