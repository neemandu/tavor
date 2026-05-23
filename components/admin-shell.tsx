"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  BookOpen,
  FileText,
  Brain,
  GraduationCap,
  Globe,
  Settings,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";

const navItems = [
  { href: "/admin/dashboard", label: "לוח בקרה", icon: LayoutDashboard },
  { href: "/admin/courses", label: "קורסים", icon: GraduationCap },
  { href: "/admin/students", label: "חניכים", icon: Users },
  { href: "/admin/vocabulary", label: "תוכן", icon: BookOpen },
  { href: "/admin/exams", label: "מבחנים", icon: FileText },
  { href: "/admin/scenarios", label: "תרחישים", icon: Brain },
  { href: "/admin/enrichment", label: "העשרה", icon: Globe },
  { href: "/admin/settings", label: "הגדרות", icon: Settings },
];

function NavLinks({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();

  return (
    <ul className="space-y-0.5">
      {navItems.map(({ href, label, icon: Icon }) => (
        <li key={href}>
          <Link
            href={href}
            onClick={onClose}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors",
              pathname.startsWith(href)
                ? "bg-primary text-primary-foreground font-medium"
                : "text-muted-foreground hover:bg-primary/5 hover:text-foreground font-normal"
            )}
          >
            <Icon className="size-4 shrink-0" />
            {label}
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const router = useRouter();

  async function handleSignOut() {
    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <div className="min-h-screen flex bg-background">
      {/* Desktop sidebar — on the right in RTL */}
      <aside className="hidden md:flex w-56 shrink-0 flex-col border-s border-border bg-background p-5">
        <div className="mb-8 flex items-center gap-2.5">
          <img src="/logo.svg" alt="תבור" className="w-9 h-9 rounded-full" />
          <div>
            <h1 className="text-sm font-bold leading-tight">תבור</h1>
            <p className="text-xs text-muted-foreground leading-tight">ניהול אולפן</p>
          </div>
        </div>

        <NavLinks />

        <div className="mt-auto space-y-1 pt-4 border-t border-border">
          <div className="flex items-center justify-between px-3 py-2">
            <span className="text-xs text-muted-foreground">מצב תצוגה</span>
            <ThemeToggle />
          </div>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors w-full"
          >
            <LogOut className="size-4 shrink-0" />
            יציאה
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="md:hidden flex items-center justify-between border-b border-border px-5 h-14 bg-background">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            <Menu className="size-5" />
          </button>
          <div className="flex items-center gap-2">
            <img src="/logo.svg" alt="תבור" className="w-7 h-7 rounded-full" />
            <h1 className="font-semibold text-sm">תבור</h1>
          </div>
          <ThemeToggle />
        </header>

        {/* Mobile drawer — slides from the right (start-0 = right in RTL) */}
        {mobileOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <div
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setMobileOpen(false)}
            />
            <aside className="absolute start-0 top-0 bottom-0 w-64 bg-background p-5 flex flex-col border-e border-border">
              <div className="flex items-center justify-between mb-8">
                <button
                  onClick={() => setMobileOpen(false)}
                  className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="size-5" />
                </button>
                <div className="flex items-center gap-2">
                  <img src="/logo.svg" alt="תבור" className="w-7 h-7 rounded-full" />
                  <h1 className="font-semibold text-sm">תבור</h1>
                </div>
              </div>
              <NavLinks onClose={() => setMobileOpen(false)} />
              <div className="mt-auto space-y-1 pt-4 border-t border-border">
                <div className="flex items-center justify-between px-3 py-2">
                  <span className="text-xs text-muted-foreground">מצב תצוגה</span>
                  <ThemeToggle />
                </div>
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors w-full"
                >
                  <LogOut className="size-4 shrink-0" />
                  יציאה
                </button>
              </div>
            </aside>
          </div>
        )}

        <main className="flex-1 overflow-y-auto p-5 md:p-8">{children}</main>
      </div>
    </div>
  );
}
