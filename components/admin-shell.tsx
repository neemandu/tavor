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
import { Button } from "@/components/ui/button";

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
    <ul className="space-y-1">
      {navItems.map(({ href, label, icon: Icon }) => (
        <li key={href}>
          <Link
            href={href}
            onClick={onClose}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              pathname.startsWith(href)
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
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
    <div className="min-h-screen flex">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-56 shrink-0 flex-col border-s bg-muted/30 p-4">
        <div className="mb-6 flex items-center gap-2.5">
          <img src="/logo.svg" alt="תבור" className="w-10 h-10 rounded-full" />
          <div>
            <h1 className="text-base font-bold leading-tight">תבור</h1>
            <p className="text-xs text-muted-foreground leading-tight">ניהול אולפן</p>
          </div>
        </div>

        <NavLinks />

        <div className="mt-auto">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-muted-foreground"
            onClick={handleSignOut}
          >
            <LogOut className="size-4" />
            יציאה
          </Button>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden flex items-center justify-between border-b px-4 h-14">
          <div className="flex items-center gap-2">
            <img src="/logo.svg" alt="תבור" className="w-8 h-8 rounded-full" />
            <h1 className="font-bold text-base">תבור</h1>
          </div>
          <button onClick={() => setMobileOpen(true)}>
            <Menu className="size-5" />
          </button>
        </header>

        {/* Mobile drawer */}
        {mobileOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <div
              className="absolute inset-0 bg-black/40"
              onClick={() => setMobileOpen(false)}
            />
            <aside className="absolute start-0 top-0 bottom-0 w-64 bg-background p-4 flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <img src="/logo.svg" alt="תבור" className="w-8 h-8 rounded-full" />
                  <h1 className="font-bold text-base">תבור</h1>
                </div>
                <button onClick={() => setMobileOpen(false)}>
                  <X className="size-5" />
                </button>
              </div>
              <NavLinks onClose={() => setMobileOpen(false)} />
              <div className="mt-auto">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start gap-2 text-muted-foreground"
                  onClick={handleSignOut}
                >
                  <LogOut className="size-4" />
                  יציאה
                </Button>
              </div>
            </aside>
          </div>
        )}

        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
