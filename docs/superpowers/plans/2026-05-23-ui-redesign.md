# UI Redesign — Tavor Arabic Ulpan Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the Tavor app from a plain zinc/white UI into a high-energy language-learning product with vibrant orange branding, fullscreen voice conversation orb, and gamified home dashboard.

**Architecture:** Update the shared design token layer first (globals.css), then work outward — fonts and animations, the splash loader, the nav shell, and finally each screen. The voice conversation redesign is extracted into a shared `VoiceOrb` component used across three interfaces. Session history is implemented as a new client component fed by a server query in the AI practice page.

**Tech Stack:** Next.js 15 App Router, Tailwind v4 (CSS variable tokens), shadcn/ui, ElevenLabs TTS (existing `useTTS` hook), Google Fonts (`Noto_Naskh_Arabic`), CSS keyframe animations only.

**Spec:** `docs/superpowers/specs/2026-05-23-ui-redesign-design.md` and `docs/superpowers/specs/2026-05-23-session-history-design.md`

---

## File Map

| File | Action |
|---|---|
| `app/globals.css` | Modify: orange primary tokens, radius, semantic colors, shadows, keyframes |
| `app/layout.tsx` | Modify: swap Noto Sans Arabic → Noto Naskh Arabic, add TavorLoader |
| `components/tavor-loader.tsx` | **Create**: splash screen with orb + "תבור" animation |
| `components/student-shell.tsx` | Modify: orange active state, center Practice button |
| `components/admin-shell.tsx` | Modify: orange active state for sidebar items |
| `app/login/login-form.tsx` | Modify: gradient header, floating card form |
| `app/page.tsx` | Modify: XP/rank card, 2×2 quick actions grid with colors |
| `components/voice-orb.tsx` | **Create**: shared animated orb component |
| `app/ai-practice/[id]/voice-chat.tsx` | Modify: fullscreen dark orb layout |
| `app/ai-practice/free/free-chat-interface.tsx` | Modify: fullscreen dark orb layout |
| `app/ai-practice/conversation/conversation-interface.tsx` | Modify: fullscreen dark orb layout |
| `app/ai-practice/page.tsx` | Modify: mode cards with accent bars, add session history query |
| `app/ai-practice/session-history.tsx` | **Create**: recent sessions client component with Sheet |
| `app/vocabulary/page.tsx` | Modify: Noto Naskh word cards, category pill tabs |
| `app/leaderboard/page.tsx` | Modify: orange podium, orange current-user row |

---

## Task 1: CSS Design Tokens

**Files:**
- Modify: `app/globals.css`

- [ ] **Step 1: Run dev server**

```bash
npm run dev
```

Open http://localhost:3000 in Chrome. Note the current zinc/black primary color across buttons, nav, active states. This is the before state.

- [ ] **Step 2: Replace `:root` color tokens and radius**

In `app/globals.css`, replace the entire `:root { ... }` block (lines 52–85) with:

```css
:root {
  --background: oklch(100% 0 0);
  --foreground: oklch(10% 0 0);
  --card: oklch(99% 0 0);
  --card-foreground: oklch(10% 0 0);
  --popover: oklch(99% 0 0);
  --popover-foreground: oklch(10% 0 0);
  --primary: oklch(65% 0.22 40);
  --primary-foreground: oklch(99% 0 0);
  --secondary: oklch(96% 0 0);
  --secondary-foreground: oklch(21% 0 0);
  --muted: oklch(96% 0 0);
  --muted-foreground: oklch(50% 0 0);
  --accent: oklch(96% 0 0);
  --accent-foreground: oklch(21% 0 0);
  --destructive: oklch(0.577 0.245 27.325);
  --border: oklch(90% 0 0);
  --input: oklch(90% 0 0);
  --ring: oklch(65% 0.22 40);
  --radius: 0.625rem;
  --shadow-card: 0 2px 12px oklch(65% 0.22 40 / 0.08);
  --shadow-elevated: 0 8px 32px oklch(0% 0 0 / 0.12);
  --streak: oklch(65% 0.22 25);
  --xp: oklch(80% 0.18 85);
  --success: oklch(60% 0.22 145);
  --chart-1: oklch(65% 0.22 40);
  --chart-2: oklch(60% 0.22 145);
  --chart-3: oklch(70% 0.18 220);
  --chart-4: oklch(80% 0.18 85);
  --chart-5: oklch(65% 0.22 25);
  --sidebar: oklch(99% 0 0);
  --sidebar-foreground: oklch(10% 0 0);
  --sidebar-primary: oklch(65% 0.22 40);
  --sidebar-primary-foreground: oklch(99% 0 0);
  --sidebar-accent: oklch(96% 0 0);
  --sidebar-accent-foreground: oklch(21% 0 0);
  --sidebar-border: oklch(90% 0 0);
  --sidebar-ring: oklch(65% 0.22 40);
}
```

- [ ] **Step 3: Replace `.dark` color tokens**

Replace the entire `.dark { ... }` block (lines 87–119) with:

```css
.dark {
  --background: oklch(8% 0 0);
  --foreground: oklch(96% 0 0);
  --card: oklch(12% 0 0);
  --card-foreground: oklch(96% 0 0);
  --popover: oklch(12% 0 0);
  --popover-foreground: oklch(96% 0 0);
  --primary: oklch(65% 0.22 40);
  --primary-foreground: oklch(99% 0 0);
  --secondary: oklch(14% 0 0);
  --secondary-foreground: oklch(96% 0 0);
  --muted: oklch(14% 0 0);
  --muted-foreground: oklch(60% 0 0);
  --accent: oklch(14% 0 0);
  --accent-foreground: oklch(96% 0 0);
  --destructive: oklch(0.704 0.191 22.216);
  --border: oklch(20% 0 0);
  --input: oklch(20% 0 0);
  --ring: oklch(65% 0.22 40);
  --sidebar: oklch(12% 0 0);
  --sidebar-foreground: oklch(96% 0 0);
  --sidebar-primary: oklch(65% 0.22 40);
  --sidebar-primary-foreground: oklch(99% 0 0);
  --sidebar-accent: oklch(14% 0 0);
  --sidebar-accent-foreground: oklch(96% 0 0);
  --sidebar-border: oklch(20% 0 0);
  --sidebar-ring: oklch(65% 0.22 40);
}
```

- [ ] **Step 4: Verify in browser**

Check http://localhost:3000. Buttons should now be vibrant orange. Nav active states should be orange. The login button should be orange. If still zinc, hard-refresh (Ctrl+Shift+R).

- [ ] **Step 5: Commit**

```bash
git add app/globals.css
git commit -m "feat: update design tokens — orange primary, warm dark mode, increased radius"
```

---

## Task 2: Typography + Animation Keyframes

**Files:**
- Modify: `app/layout.tsx` — swap `Noto_Sans_Arabic` → `Noto_Naskh_Arabic`
- Modify: `app/globals.css` — add keyframes

- [ ] **Step 1: Swap font in layout.tsx**

In `app/layout.tsx`, replace the two import lines and font configs:

```tsx
import type { Metadata } from "next";
import { Alef, Noto_Naskh_Arabic } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const hebrewFont = Alef({
  variable: "--font-noto-hebrew",
  subsets: ["hebrew", "latin"],
  weight: ["400", "700"],
  display: "swap",
});

const arabicFont = Noto_Naskh_Arabic({
  variable: "--font-noto-arabic",
  subsets: ["arabic"],
  weight: ["400", "500", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "תבור – אולפן ערבית",
  description: "מערכת לניהול אולפן ערבית צבאי",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{__html:`
          try{var s=localStorage.getItem('theme'),p=window.matchMedia('(prefers-color-scheme:dark)').matches;if(s==='dark'||(s!=='light'&&p))document.documentElement.classList.add('dark')}catch(e){}
        `}} />
      </head>
      <body
        className={`${hebrewFont.variable} ${arabicFont.variable} antialiased`}
      >
        {children}
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Add keyframes to globals.css**

At the end of `app/globals.css`, after the `@layer base { ... }` block, add:

```css
@keyframes breathe {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.08); }
}

@keyframes celebrate {
  0% { transform: scale(0.8); opacity: 0; }
  60% { transform: scale(1.1); }
  100% { transform: scale(1); opacity: 1; }
}

@keyframes orb-enter {
  from {
    transform: scale(0.6);
    opacity: 0;
    box-shadow: none;
  }
  to {
    transform: scale(1);
    opacity: 1;
    box-shadow: 0 0 80px oklch(65% 0.22 40 / 0.7);
  }
}

@keyframes word-fade {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}

@keyframes loader-exit {
  from { opacity: 1; transform: translateY(0); }
  to   { opacity: 0; transform: translateY(-40px); }
}
```

- [ ] **Step 3: Verify**

Open http://localhost:3000/vocabulary and inspect Arabic text — it should render with Noto Naskh Arabic (a more calligraphic, authentic feel vs Noto Sans). No layout errors should appear.

- [ ] **Step 4: Commit**

```bash
git add app/layout.tsx app/globals.css
git commit -m "feat: upgrade Arabic font to Noto Naskh, add animation keyframes"
```

---

## Task 3: App Launch Loader

**Files:**
- Create: `components/tavor-loader.tsx`
- Modify: `app/layout.tsx`

- [ ] **Step 1: Create the loader component**

Create `components/tavor-loader.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";

export function TavorLoader() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem("loader-shown")) return;
    setVisible(true);
    const t = setTimeout(() => {
      sessionStorage.setItem("loader-shown", "1");
      setVisible(false);
    }, 2300);
    return () => clearTimeout(t);
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-[#0A0A0A] flex items-center justify-center overflow-hidden pointer-events-none">
      <div
        className="flex flex-col items-center gap-6"
        style={{ animation: "loader-exit 0.6s ease-in 1.6s both" }}
      >
        <div
          className="w-32 h-32 rounded-full"
          style={{
            background:
              "radial-gradient(circle at center, oklch(70% 0.22 40 / 0.9), oklch(65% 0.22 40))",
            animation:
              "orb-enter 0.4s ease-out both, breathe 0.4s ease-in-out 0.4s 1",
          }}
        />
        <span
          className="text-5xl font-black text-white"
          style={{ animation: "word-fade 0.4s ease-out 0.8s both" }}
        >
          תבור
        </span>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add loader to layout.tsx**

In `app/layout.tsx`, import `TavorLoader` and render it before `{children}`:

```tsx
import type { Metadata } from "next";
import { Alef, Noto_Naskh_Arabic } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { TavorLoader } from "@/components/tavor-loader";
import "./globals.css";

// ... (font configs unchanged) ...

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{__html:`
          try{var s=localStorage.getItem('theme'),p=window.matchMedia('(prefers-color-scheme:dark)').matches;if(s==='dark'||(s!=='light'&&p))document.documentElement.classList.add('dark')}catch(e){}
        `}} />
      </head>
      <body
        className={`${hebrewFont.variable} ${arabicFont.variable} antialiased`}
      >
        <TavorLoader />
        {children}
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Verify loader animation**

Open http://localhost:3000 in an incognito window (or clear sessionStorage via DevTools → Application → Storage → Clear site data). The dark splash screen should appear: orb grows with orange glow, "תבור" fades in, both slide up after ~1.6s revealing the page. Refresh in normal window — loader is skipped.

- [ ] **Step 4: Commit**

```bash
git add components/tavor-loader.tsx app/layout.tsx
git commit -m "feat: add Tavor splash loader with orb + fade animation"
```

---

## Task 4: Student Shell Navigation

**Files:**
- Modify: `components/student-shell.tsx`

- [ ] **Step 1: Rewrite student-shell.tsx**

Replace the entire file with:

```tsx
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
```

- [ ] **Step 2: Verify**

Open http://localhost:3000. The bottom nav should have: Home | Vocabulary | (orange circle Practice in center, elevated) | Leaderboard | More. Tap "תרגול" — circle stays orange. Other tabs show gray icon + orange dot when active.

- [ ] **Step 3: Commit**

```bash
git add components/student-shell.tsx
git commit -m "feat: redesign student nav — orange active state, elevated center Practice button"
```

---

## Task 5: Login Page

**Files:**
- Modify: `app/login/login-form.tsx`

- [ ] **Step 1: Rewrite login-form.tsx**

Replace the entire file:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !data.user) {
      setError("אימייל או סיסמה שגויים");
      setLoading(false);
      return;
    }

    const role = data.user.user_metadata?.role as string | undefined;
    router.push(role === "admin" ? "/admin/dashboard" : "/");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Orange gradient header — top 40% */}
      <div className="h-[40vh] bg-gradient-to-b from-primary to-[oklch(60%_0.22_40)] flex flex-col items-center justify-center gap-2 px-6">
        <h1 className="text-4xl font-black text-white tracking-tight">תבור</h1>
        <p className="text-lg text-white/80">בית הספר לערבית</p>
      </div>

      {/* Floating form card */}
      <div className="flex-1 flex flex-col items-center px-6 -mt-8">
        <div className="w-full max-w-sm bg-card rounded-2xl shadow-[0_8px_32px_oklch(0%_0_0/0.12)] p-6 space-y-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium">
                אימייל
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                autoComplete="email"
                dir="ltr"
                className="h-12 rounded-xl border-2 focus:border-primary focus-visible:ring-0"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-medium">
                סיסמה
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                dir="ltr"
                className="h-12 rounded-xl border-2 focus:border-primary focus-visible:ring-0"
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button
              type="submit"
              className="w-full h-12 rounded-xl font-bold text-base"
              disabled={loading}
            >
              {loading ? "מתחבר..." : "כניסה"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify**

Open http://localhost:3000/login (log out first if needed). The top 40% should be a vibrant orange gradient. The white card floats over it with the form inside. Inputs should have `rounded-xl` corners with orange focus border.

- [ ] **Step 3: Commit**

```bash
git add app/login/login-form.tsx
git commit -m "feat: redesign login page — orange gradient header, floating card form"
```

---

## Task 6: Home Dashboard

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Rewrite app/page.tsx**

Replace the entire file:

```tsx
export const dynamic = "force-dynamic";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { StudentShell } from "@/components/student-shell";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { BookOpen, Search, MessageSquare, FileText, Trophy, Mic } from "lucide-react";

type LeaderboardRow = {
  user_id: string;
  name: string;
  total_points: number;
  rank: number;
};

const QUICK_ACTIONS = [
  {
    href: "/ai-practice/conversation",
    label: "שיחה קולית",
    sublabel: "שיחה חופשית 30 דק'",
    icon: Mic,
    bg: "from-primary/90 to-primary",
    textColor: "text-white",
  },
  {
    href: "/vocabulary",
    label: "מילים חדשות",
    sublabel: "אוצר מילים",
    icon: Search,
    bg: "from-teal-500 to-teal-600",
    textColor: "text-white",
  },
  {
    href: "/ai-practice",
    label: "תרחיש",
    sublabel: "תרגול מובנה",
    icon: FileText,
    bg: "from-indigo-500 to-indigo-600",
    textColor: "text-white",
  },
  {
    href: "/leaderboard",
    label: "לוח שיאים",
    sublabel: "דירוג ונקודות",
    icon: Trophy,
    bg: "from-amber-400 to-amber-500",
    textColor: "text-white",
  },
] as const;

export default async function StudentHome() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const name = (user?.user_metadata?.name as string) ?? "חניך";
  const adminSupabase = createAdminClient();

  const [{ data: credits }, { data: accessData }] = await Promise.all([
    supabase
      .from("ai_credits")
      .select("monthly_limit, current_month_usage")
      .eq("user_id", user!.id)
      .maybeSingle(),
    adminSupabase
      .from("user_course_access")
      .select("course_id")
      .eq("user_id", user!.id)
      .limit(1)
      .maybeSingle(),
  ]);

  const courseId = accessData?.course_id ?? null;

  let myEntry: LeaderboardRow | undefined;

  if (courseId) {
    const [{ data: courseData }, { data: lbData }] = await Promise.all([
      adminSupabase
        .from("courses")
        .select("show_leaderboard")
        .eq("id", courseId)
        .maybeSingle(),
      adminSupabase.rpc("get_leaderboard", { p_course_id: courseId, p_period: "all" }),
    ]);

    if (courseData?.show_leaderboard !== false) {
      const rows: LeaderboardRow[] = (lbData ?? []) as LeaderboardRow[];
      myEntry = rows.find((r) => r.user_id === user!.id);
    }
  }

  const creditsLeft = credits
    ? credits.monthly_limit - credits.current_month_usage
    : null;

  return (
    <StudentShell>
      <div className="p-5 space-y-6 max-w-lg mx-auto">
        {/* Greeting */}
        <div className="pt-2">
          <h1 className="text-3xl font-black">שלום, {name}!</h1>
        </div>

        {/* XP + Rank card */}
        {myEntry && (
          <Card className="rounded-2xl border-s-4 border-s-primary shadow-[var(--shadow-card)]">
            <CardContent className="p-5">
              <div className="flex items-center justify-between gap-4">
                <div className="text-center">
                  <p className="text-2xl font-black text-primary">
                    {myEntry.total_points.toLocaleString("he-IL")}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">נקודות XP</p>
                </div>
                <div className="w-px h-10 bg-border" />
                <div className="text-center">
                  <p className="text-2xl font-black">#{myEntry.rank}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">דירוג</p>
                </div>
                {creditsLeft !== null && (
                  <>
                    <div className="w-px h-10 bg-border" />
                    <div className="text-center">
                      <p className="text-2xl font-black">{creditsLeft}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">שיחות נותרו</p>
                    </div>
                  </>
                )}
              </div>
              {myEntry && (
                <div className="mt-4">
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{
                        width: `${Math.min(100, (myEntry.total_points % 100))}%`,
                      }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    עוד {100 - (myEntry.total_points % 100)} נקודות לרמה הבאה
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Quick actions 2x2 */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            גישה מהירה
          </p>
          <div className="grid grid-cols-2 gap-3">
            {QUICK_ACTIONS.map(({ href, label, sublabel, icon: Icon, bg, textColor }) => (
              <Link key={href} href={href}>
                <Card
                  className={`rounded-2xl overflow-hidden hover:opacity-90 transition-opacity active:scale-[0.98] cursor-pointer bg-gradient-to-br ${bg}`}
                >
                  <CardContent className="p-4 space-y-2">
                    <Icon className={`size-8 ${textColor}`} strokeWidth={2} />
                    <div>
                      <p className={`font-bold text-sm leading-tight ${textColor}`}>{label}</p>
                      <p className={`text-xs mt-0.5 ${textColor} opacity-80`}>{sublabel}</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        {/* Handbook link */}
        <Link href="/handbook">
          <Card className="rounded-2xl hover:bg-muted/40 transition-colors cursor-pointer active:scale-[0.98]">
            <CardContent className="p-4 flex items-center gap-3">
              <BookOpen className="size-5 text-primary shrink-0" />
              <div>
                <p className="font-semibold text-sm">חוברת לימוד</p>
                <p className="text-xs text-muted-foreground">חומרי הקורס</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </StudentShell>
  );
}
```

- [ ] **Step 2: Verify**

Open http://localhost:3000. See: bold "שלום, [name]!", orange-bordered XP+rank card with progress bar, 2×2 colorful quick-action grid. No TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add app/page.tsx
git commit -m "feat: redesign home dashboard — XP card, colorful quick actions grid"
```

---

## Task 7: Shared Voice Orb Component

**Files:**
- Create: `components/voice-orb.tsx`

- [ ] **Step 1: Create voice-orb.tsx**

Create `components/voice-orb.tsx`:

```tsx
"use client";

import { cn } from "@/lib/utils";

export type OrbState = "idle" | "listening" | "speaking" | "loading";

const ORB_BACKGROUNDS: Record<OrbState, string> = {
  idle: "radial-gradient(circle at center, oklch(35% 0 0), oklch(20% 0 0))",
  listening: "radial-gradient(circle at center, oklch(92% 0 0), oklch(78% 0 0))",
  speaking:
    "radial-gradient(circle at center, oklch(70% 0.22 40 / 0.9), oklch(65% 0.22 40))",
  loading:
    "radial-gradient(circle at center, oklch(65% 0.22 40 / 0.35), oklch(55% 0.22 40 / 0.25))",
};

interface VoiceOrbProps {
  state: OrbState;
  onClick: () => void;
  disabled?: boolean;
}

export function VoiceOrb({ state, onClick, disabled }: VoiceOrbProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label="מיקרופון"
      className={cn(
        "w-48 h-48 rounded-full relative transition-all duration-500 focus:outline-none",
        state === "idle" && "opacity-40",
        state === "listening" &&
          "shadow-[0_0_60px_rgba(255,255,255,0.3)] animate-pulse",
        state === "speaking" &&
          "shadow-[0_0_80px_rgba(255,107,53,0.6)] [animation:breathe_1.5s_ease-in-out_infinite]",
        disabled && "cursor-not-allowed"
      )}
      style={{ background: ORB_BACKGROUNDS[state] }}
    >
      {state === "loading" && (
        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary/60 animate-spin" />
      )}
    </button>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors related to `voice-orb.tsx`.

- [ ] **Step 3: Commit**

```bash
git add components/voice-orb.tsx
git commit -m "feat: add shared VoiceOrb component with 4 animated states"
```

---

## Task 8: Voice Conversation Screens — Fullscreen Orb

**Files:**
- Modify: `app/ai-practice/conversation/conversation-interface.tsx`
- Modify: `app/ai-practice/free/free-chat-interface.tsx`
- Modify: `app/ai-practice/[id]/voice-chat.tsx`

### 8a — conversation-interface.tsx

- [ ] **Step 1: Replace the chat phase render in conversation-interface.tsx**

The file already has all the state logic. Only the JSX returned from the chat phase and feedback phase changes. Replace the two return blocks (feedback phase `if (phase === "feedback")` and the final chat return) with:

```tsx
  // ── Feedback ────────────────────────────────────────────────────────────────
  if (phase === "feedback") {
    return (
      <div className="p-5 max-w-lg mx-auto space-y-5">
        <div
          className="flex flex-col items-center pt-6 pb-2"
          style={{ animation: "celebrate 0.5s ease-out both" }}
        >
          <div className="w-16 h-16 rounded-full bg-[oklch(60%_0.22_145)] flex items-center justify-center mb-4">
            <span className="text-3xl text-white">✓</span>
          </div>
          <h1 className="text-xl font-black">פידבק – שיחה חופשית</h1>
        </div>
        <Card className="rounded-2xl shadow-[var(--shadow-card)]">
          <CardContent className="p-5 text-sm leading-relaxed whitespace-pre-wrap">
            {feedback}
          </CardContent>
        </Card>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 rounded-xl"
          onClick={() => (isPlaying ? stopTTS() : playTTS(feedback, "he"))}
        >
          {isPlaying ? (
            <>
              <Volume2 className="size-4 animate-pulse" /> עצור
            </>
          ) : (
            <>
              <Volume2 className="size-4" /> השמע פידבק בעברית
            </>
          )}
        </Button>
        <Button
          variant="outline"
          className="w-full rounded-xl"
          onClick={() => {
            stopTTS();
            setPhase("chat");
            setMessages([]);
            setFeedback("");
            setSessionId(null);
            setTimeLeft(TOTAL_SECONDS);
            setConversationStarted(false);
            timerRef.current = setInterval(() => {
              setTimeLeft((prev) => {
                if (prev <= 1) {
                  clearInterval(timerRef.current!);
                  timerRef.current = null;
                  return 0;
                }
                return prev - 1;
              });
            }, 1000);
          }}
        >
          שיחה חדשה
        </Button>
      </div>
    );
  }

  // ── Chat (fullscreen orb) ────────────────────────────────────────────────────
  const orbState: OrbState =
    (loading || loadingFeedback) && !isPlaying
      ? "loading"
      : isRecording
      ? "listening"
      : isPlaying
      ? "speaking"
      : "idle";

  const stateLabel =
    timeLeft === 0
      ? "הזמן נגמר"
      : !conversationStarted
      ? "לחץ להתחלת שיחה"
      : isRecording
      ? "מקשיב..."
      : isPlaying
      ? "ה-AI מדבר..."
      : loading
      ? "מעבד..."
      : "מתכונן להאזין...";

  return (
    <div className="fixed inset-0 bg-[#0A0A0A] flex flex-col overflow-hidden">
      {/* Minimal header */}
      <div className="flex items-center gap-3 px-4 pt-12 pb-4">
        <Clock
          className={cn(
            "size-4",
            isLowTime && timeLeft > 0
              ? "text-primary"
              : timeLeft === 0
              ? "text-destructive"
              : "text-white/50"
          )}
        />
        <span
          className={cn(
            "text-sm font-mono",
            isLowTime && timeLeft > 0
              ? "text-primary"
              : timeLeft === 0
              ? "text-destructive"
              : "text-white/50"
          )}
        >
          {formatTime(timeLeft)}
        </span>
        <span className="text-white/50 text-sm me-auto">שיחה חופשית · ניב עזתי</span>
      </div>

      {/* Center */}
      <div className="flex-1 flex flex-col items-center justify-center gap-8 px-6">
        {/* Transcript */}
        {transcript && (
          <p
            className="text-white/60 text-sm text-center max-w-xs"
            dir="rtl"
            lang="ar"
            style={{ fontFamily: "var(--font-noto-arabic)" }}
          >
            {transcript}
          </p>
        )}

        <VoiceOrb
          state={orbState}
          onClick={handleMicPress}
          disabled={timeLeft === 0}
        />

        <div className="flex flex-col items-center gap-4">
          <p className="text-white text-lg font-semibold text-center">{stateLabel}</p>
          <button
            onClick={() => endSession(false)}
            disabled={messages.length === 0 || loading || loadingFeedback}
            className="text-white/50 text-sm underline underline-offset-2 disabled:opacity-20 transition-opacity"
          >
            {loadingFeedback ? "מכין פידבק..." : "סיים וקבל פידבק"}
          </button>
        </div>
      </div>
    </div>
  );
```

- [ ] **Step 2: Add VoiceOrb import and OrbState type to conversation-interface.tsx**

At the top of the file, add the import after the existing imports:

```tsx
import { VoiceOrb, type OrbState } from "@/components/voice-orb";
```

Also remove the imports that are no longer used in the chat phase: `Separator`, `MicOff`, `StopCircle` (keep if still used in feedback). Check the feedback phase — `Volume2` is still used. `Loader2` is still used in the feedback button. Keep those. Remove `MicOff`, `Separator`, `StopCircle` from the import if the chat phase no longer uses them directly.

After the edit, the import line should look like:

```tsx
import { Mic, Volume2, Loader2, Clock } from "lucide-react";
```

(`MicOff`, `StopCircle`, `Separator` removed since the new fullscreen UI doesn't have a message list or separate stop button.)

- [ ] **Step 3: TypeScript check**

```bash
npx tsc --noEmit
```

Fix any unused import errors that TypeScript flags.

### 8b — free-chat-interface.tsx

- [ ] **Step 4: Update the chat phase return in free-chat-interface.tsx**

The file has three phases: `setup`, `feedback`, and chat (the final return). Replace the `feedback` phase return and final chat return:

```tsx
  // ── Feedback ────────────────────────────────────────────────────────────────
  if (phase === "feedback") {
    return (
      <div className="p-5 max-w-lg mx-auto space-y-5">
        <div
          className="flex flex-col items-center pt-6 pb-2"
          style={{ animation: "celebrate 0.5s ease-out both" }}
        >
          <div className="w-16 h-16 rounded-full bg-[oklch(60%_0.22_145)] flex items-center justify-center mb-4">
            <span className="text-3xl text-white">✓</span>
          </div>
          <h1 className="text-xl font-black">פידבק – תרגול חופשי</h1>
        </div>
        <Card className="rounded-2xl shadow-[var(--shadow-card)]">
          <CardContent className="p-5 text-sm leading-relaxed whitespace-pre-wrap">
            {feedback}
          </CardContent>
        </Card>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 rounded-xl"
          onClick={() => (isPlaying ? stopTTS() : playTTS(feedback, "he"))}
        >
          {isPlaying ? (
            <><Volume2 className="size-4 animate-pulse" /> עצור</>
          ) : (
            <><Volume2 className="size-4" /> השמע פידבק בעברית</>
          )}
        </Button>
        <Button
          variant="outline"
          className="w-full rounded-xl"
          onClick={() => {
            stopTTS();
            setPhase("setup");
            setMessages([]);
            setFeedback("");
            setSessionId(null);
            setDescription("");
            setConversationStarted(false);
          }}
        >
          תרגול חדש
        </Button>
      </div>
    );
  }

  // ── Chat (fullscreen orb) ────────────────────────────────────────────────────
  const orbState: OrbState =
    loading && !isPlaying
      ? "loading"
      : isRecording
      ? "listening"
      : isPlaying
      ? "speaking"
      : "idle";

  const stateLabel = !conversationStarted
    ? "לחץ להתחלת שיחה"
    : isRecording
    ? "מקשיב..."
    : isPlaying
    ? "ה-AI מדבר..."
    : loading
    ? "מעבד..."
    : "מתכונן להאזין...";

  return (
    <div className="fixed inset-0 bg-[#0A0A0A] flex flex-col overflow-hidden">
      {/* Minimal header */}
      <div className="flex items-center gap-3 px-4 pt-12 pb-4">
        <span className="text-white/50 text-sm line-clamp-1">תרגול חופשי · {description}</span>
      </div>

      {/* Center */}
      <div className="flex-1 flex flex-col items-center justify-center gap-8 px-6">
        {transcript && (
          <p
            className="text-white/60 text-sm text-center max-w-xs"
            dir="rtl"
            lang="ar"
            style={{ fontFamily: "var(--font-noto-arabic)" }}
          >
            {transcript}
          </p>
        )}

        <VoiceOrb
          state={orbState}
          onClick={handleMicPress}
          disabled={false}
        />

        <div className="flex flex-col items-center gap-4">
          <p className="text-white text-lg font-semibold text-center">{stateLabel}</p>
          <button
            onClick={endSession}
            disabled={messages.length === 0 || loading || loadingFeedback}
            className="text-white/50 text-sm underline underline-offset-2 disabled:opacity-20 transition-opacity"
          >
            {loadingFeedback ? "מכין פידבק..." : "סיים וקבל פידבק"}
          </button>
        </div>
      </div>
    </div>
  );
```

- [ ] **Step 5: Add VoiceOrb import to free-chat-interface.tsx**

Add:
```tsx
import { VoiceOrb, type OrbState } from "@/components/voice-orb";
```

Update the lucide import to remove unused icons (`MicOff`, `StopCircle`, `Separator`):
```tsx
import { Volume2, Loader2 } from "lucide-react";
```

Remove the `Textarea` import too if the setup phase stays as-is (it still uses `Textarea` in the setup phase — keep it).

After editing, the lucide import line for free-chat-interface should keep: `Mic` (used in setup phase button), `Volume2`, `Loader2`. Remove `MicOff`, `StopCircle`.

### 8c — voice-chat.tsx (scenario)

- [ ] **Step 6: Update chat phase in voice-chat.tsx**

The file has three phases: `briefing`, `chat`, and `feedback`. The briefing phase gets orange accent colors. The feedback phase gets the celebrate animation. The chat phase becomes fullscreen orb.

Find the feedback phase return (currently returns a Card with feedback text) and replace:

```tsx
  // ── Feedback ────────────────────────────────────────────────────────────────
  if (phase === "feedback") {
    return (
      <div className="p-5 max-w-lg mx-auto space-y-5">
        <div
          className="flex flex-col items-center pt-6 pb-2"
          style={{ animation: "celebrate 0.5s ease-out both" }}
        >
          <div className="w-16 h-16 rounded-full bg-[oklch(60%_0.22_145)] flex items-center justify-center mb-4">
            <span className="text-3xl text-white">✓</span>
          </div>
          <h1 className="text-xl font-black">פידבק – {scenario.name}</h1>
        </div>
        <Card className="rounded-2xl shadow-[var(--shadow-card)]">
          <CardContent className="p-5 text-sm leading-relaxed whitespace-pre-wrap">
            {feedback}
          </CardContent>
        </Card>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 rounded-xl"
          onClick={() => (isPlaying ? stopTTS() : playTTS(feedback, "he"))}
        >
          {isPlaying ? (
            <><Volume2 className="size-4 animate-pulse" /> עצור</>
          ) : (
            <><Volume2 className="size-4" /> השמע פידבק בעברית</>
          )}
        </Button>
        <Link href="/ai-practice">
          <Button variant="outline" className="w-full rounded-xl">
            תרחיש חדש
          </Button>
        </Link>
      </div>
    );
  }
```

Find the chat phase return (the block starting with `// ── Chat` and returning the voice interface) and replace with the fullscreen orb:

```tsx
  // ── Chat (fullscreen orb) ────────────────────────────────────────────────────
  const orbState: OrbState =
    (loadingAI || loadingFeedback) && !isPlaying
      ? "loading"
      : isRecording
      ? "listening"
      : isPlaying
      ? "speaking"
      : "idle";

  const stateLabel = !conversationStarted
    ? "לחץ להתחלת שיחה"
    : isRecording
    ? "מקשיב..."
    : isPlaying
    ? "ה-AI מדבר..."
    : loadingAI
    ? "מעבד..."
    : "מתכונן להאזין...";

  return (
    <div className="fixed inset-0 bg-[#0A0A0A] flex flex-col overflow-hidden">
      {/* Minimal header */}
      <div className="flex items-center gap-3 px-4 pt-12 pb-4">
        <Link href="/ai-practice" className="text-white/60 hover:text-white/90">
          <ArrowRight className="size-5" />
        </Link>
        <span className="text-white/70 text-sm font-medium">{scenario.name}</span>
      </div>

      {/* Center */}
      <div className="flex-1 flex flex-col items-center justify-center gap-8 px-6">
        {transcript && (
          <p
            className="text-white/60 text-sm text-center max-w-xs"
            dir="rtl"
            lang="ar"
            style={{ fontFamily: "var(--font-noto-arabic)" }}
          >
            {transcript}
          </p>
        )}

        <VoiceOrb
          state={orbState}
          onClick={handleMicPress}
          disabled={false}
        />

        <div className="flex flex-col items-center gap-4">
          <p className="text-white text-lg font-semibold text-center">{stateLabel}</p>
          <button
            onClick={endSession}
            disabled={messages.length === 0 || loadingAI || loadingFeedback}
            className="text-white/50 text-sm underline underline-offset-2 disabled:opacity-20 transition-opacity"
          >
            {loadingFeedback ? "מכין פידבק..." : "סיים וקבל פידבק"}
          </button>
        </div>
      </div>
    </div>
  );
```

- [ ] **Step 7: Update the briefing phase styling in voice-chat.tsx**

Find the briefing phase return and update cards to `rounded-2xl` and add orange accents:

```tsx
  // ── Briefing ────────────────────────────────────────────────────────────────
  if (phase === "briefing") {
    return (
      <div className="p-5 max-w-lg mx-auto space-y-5">
        <div className="pt-2">
          <h1 className="text-2xl font-black">{scenario.name}</h1>
          {scenario.difficulty && (
            <span className={`inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded-full ${difficultyColors[scenario.difficulty as ScenarioDifficulty]}`}>
              {DIFFICULTY_LABELS[scenario.difficulty as ScenarioDifficulty]}
            </span>
          )}
        </div>

        <Card className="rounded-2xl border-s-4 border-s-primary shadow-[var(--shadow-card)]">
          <CardContent className="p-5 space-y-3">
            {scenario.student_description && (
              <p className="text-sm leading-relaxed">{scenario.student_description}</p>
            )}
            {scenario.student_role && (
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1">התפקיד שלך</p>
                <p className="text-sm font-medium">{scenario.student_role}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {hints.length > 0 && (
          <div>
            <button
              onClick={() => setHintsOpen((o) => !o)}
              className="flex items-center gap-1.5 text-sm font-semibold text-primary mb-2"
            >
              {hintsOpen ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
              רמזים ({hints.length})
            </button>
            {hintsOpen && (
              <Card className="rounded-2xl">
                <CardContent className="p-4 space-y-2">
                  {hints.map((hint, i) => (
                    <p key={i} className="text-sm text-muted-foreground">
                      {i + 1}. {hint}
                    </p>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        )}

        <Button
          className="w-full h-12 rounded-xl font-bold text-base gap-2"
          onClick={() => {
            setPhase("chat");
            setConversationStarted(true);
          }}
        >
          <Mic className="size-5" />
          התחל תרחיש
        </Button>
      </div>
    );
  }
```

- [ ] **Step 8: Add VoiceOrb import to voice-chat.tsx**

Add after existing imports:
```tsx
import { VoiceOrb, type OrbState } from "@/components/voice-orb";
```

Remove unused lucide imports (`MicOff`, `VolumeX`, `StopCircle` if no longer used in briefing/feedback/chat). Keep `Mic`, `Volume2`, `ChevronDown`, `ChevronUp`, `ArrowRight`.

- [ ] **Step 9: Verify all three voice screens**

Run dev server. Open:
1. http://localhost:3000/ai-practice/conversation — click the orb → listening (white glow pulse), AI responds → speaking (orange breathe), loading → dim spinning ring
2. http://localhost:3000/ai-practice/free — setup phase unchanged, chat phase is fullscreen orb
3. http://localhost:3000/ai-practice/[scenario-id] — briefing card with orange left border, start → fullscreen orb, end → green ✓ celebrate

```bash
npx tsc --noEmit
```

- [ ] **Step 10: Commit**

```bash
git add components/voice-orb.tsx \
  app/ai-practice/conversation/conversation-interface.tsx \
  app/ai-practice/free/free-chat-interface.tsx \
  "app/ai-practice/[id]/voice-chat.tsx"
git commit -m "feat: voice screens — fullscreen dark orb with 4 animated states"
```

---

## Task 9: AI Practice Hub — Mode Cards

**Files:**
- Modify: `app/ai-practice/page.tsx`

- [ ] **Step 1: Rewrite the mode cards section in page.tsx**

Replace the entire file:

```tsx
export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { StudentShell } from "@/components/student-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  DIFFICULTY_LABELS,
  SCENARIO_CATEGORY_LABELS,
  type ScenarioDifficulty,
  type ScenarioCategory,
} from "@/types";
import { ChevronLeft, Zap, PenLine, MessageCircle, List } from "lucide-react";

type ModeCard = {
  href: string | null;
  icon: React.ElementType;
  title: string;
  description: string;
  accentColor: string;
};

const MODES: ModeCard[] = [
  {
    href: null,
    icon: List,
    title: "תרחישים מובנים",
    description: "תרגול לפי תרחישים מוגדרים",
    accentColor: "border-s-primary",
  },
  {
    href: "/ai-practice/free",
    icon: PenLine,
    title: "תרגול חופשי",
    description: "תאר סיטואציה ותרגל אותה",
    accentColor: "border-s-teal-500",
  },
  {
    href: "/ai-practice/conversation",
    icon: MessageCircle,
    title: "שיחה חופשית",
    description: "שיחה פתוחה 30 דקות בערבית",
    accentColor: "border-s-indigo-500",
  },
];

export default async function AIPracticePage() {
  const supabase = await createClient();

  const { data: scenariosData } = await supabase
    .from("scenarios")
    .select("id, name, student_description, difficulty, category")
    .eq("is_active", true)
    .order("created_at", { ascending: false });
  const scenarios = scenariosData ?? [];

  const difficultyColors: Record<ScenarioDifficulty, string> = {
    easy: "bg-green-100 text-green-700",
    medium: "bg-yellow-100 text-yellow-700",
    hard: "bg-red-100 text-red-700",
  };

  return (
    <StudentShell>
      <div className="p-4 max-w-lg mx-auto space-y-5">
        <div className="pt-2">
          <h1 className="text-3xl font-black">תרגול AI</h1>
          <p className="text-sm text-muted-foreground">בחר מצב תרגול</p>
        </div>

        {/* Mode cards */}
        <div className="space-y-3">
          {MODES.map((mode) => {
            const Icon = mode.icon;
            const card = (
              <Card
                className={`rounded-2xl border-s-4 ${mode.accentColor} shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-elevated)] transition-shadow cursor-pointer`}
              >
                <CardContent className="p-5 flex items-center gap-4">
                  <Icon className="size-10 text-muted-foreground shrink-0" strokeWidth={1.5} />
                  <div className="flex-1 space-y-0.5">
                    <p className="text-lg font-bold leading-tight">{mode.title}</p>
                    <p className="text-sm text-muted-foreground">{mode.description}</p>
                  </div>
                  <ChevronLeft className="size-5 text-muted-foreground shrink-0" />
                </CardContent>
              </Card>
            );

            if (mode.href) {
              return (
                <Link key={mode.title} href={mode.href}>
                  {card}
                </Link>
              );
            }
            return <div key={mode.title}>{card}</div>;
          })}
        </div>

        {/* Scenarios list */}
        <div>
          <p className="text-sm font-semibold text-muted-foreground mb-3">
            תרחישים מובנים
          </p>

          {scenarios.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground text-center">
              <Zap className="size-12 mb-3 opacity-30" />
              <p>עדיין אין תרחישים פעילים</p>
              <p className="text-sm">פנה למדריך שלך</p>
            </div>
          ) : (
            <div className="space-y-3">
              {scenarios.map((scenario) => (
                <Link key={scenario.id} href={`/ai-practice/${scenario.id}`}>
                  <Card className="rounded-2xl hover:bg-muted/50 transition-colors cursor-pointer shadow-[var(--shadow-card)]">
                    <CardContent className="p-4 flex items-start gap-3">
                      <div className="flex-1 space-y-1.5">
                        <p className="font-bold">{scenario.name}</p>
                        {scenario.student_description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {scenario.student_description}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {scenario.difficulty && (
                            <span
                              className={`text-xs font-medium px-2 py-0.5 rounded-full ${difficultyColors[scenario.difficulty as ScenarioDifficulty]}`}
                            >
                              {DIFFICULTY_LABELS[scenario.difficulty as ScenarioDifficulty]}
                            </span>
                          )}
                          {scenario.category && (
                            <Badge variant="outline" className="text-xs rounded-full">
                              {SCENARIO_CATEGORY_LABELS[scenario.category as ScenarioCategory]}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <ChevronLeft className="size-5 text-muted-foreground shrink-0 mt-1" />
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </StudentShell>
  );
}
```

- [ ] **Step 2: Verify**

Open http://localhost:3000/ai-practice. Mode cards should be vertical with colored left accent bars (orange, teal, indigo). Scenario list cards should have `rounded-2xl` and warm shadow. TypeScript: `npx tsc --noEmit`.

- [ ] **Step 3: Commit**

```bash
git add app/ai-practice/page.tsx
git commit -m "feat: AI practice hub — vertical mode cards with colored accent bars"
```

---

## Task 10: Session History

**Files:**
- Create: `app/ai-practice/session-history.tsx`
- Modify: `app/ai-practice/page.tsx`

- [ ] **Step 1: Create session-history.tsx**

Create `app/ai-practice/session-history.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Volume2 } from "lucide-react";
import { useTTS } from "@/hooks/use-tts";
import { cn } from "@/lib/utils";

type SessionType = "scenario" | "free_practice" | "free_conversation";

type Session = {
  id: string;
  session_type: SessionType;
  started_at: string;
  ended_at: string | null;
  feedback_text: string | null;
  messages: { role: string; content: string }[] | null;
  scenario_name: string | null;
};

const TYPE_LABELS: Record<SessionType, string> = {
  scenario: "תרחיש",
  free_practice: "תרגול חופשי",
  free_conversation: "שיחה חופשית",
};

const TYPE_COLORS: Record<SessionType, string> = {
  scenario: "bg-primary/10 text-primary",
  free_practice: "bg-teal-100 text-teal-700",
  free_conversation: "bg-indigo-100 text-indigo-700",
};

function relativeDate(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return "היום";
  if (days === 1) return "אתמול";
  return `לפני ${days} ימים`;
}

function formatDuration(start: string, end: string | null): string {
  if (!end) return "—";
  const minutes = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60_000);
  return `${minutes} דק'`;
}

interface Props {
  sessions: Session[];
}

export function SessionHistory({ sessions }: Props) {
  const [openId, setOpenId] = useState<string | null>(null);
  const { play: playTTS, stop: stopTTS, isPlaying } = useTTS();

  const openSession = sessions.find((s) => s.id === openId) ?? null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <p className="text-sm font-semibold text-muted-foreground">שיחות אחרונות</p>
        <Badge variant="outline" className="text-xs rounded-full">
          {sessions.length}
        </Badge>
      </div>

      {sessions.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-6">
          עדיין לא ניהלת שיחות
        </p>
      )}

      {sessions.map((session) => {
        const hasFeedback = !!session.feedback_text;
        const preview = session.feedback_text
          ? session.feedback_text.slice(0, 80) + (session.feedback_text.length > 80 ? "…" : "")
          : null;

        return (
          <button
            key={session.id}
            onClick={() => hasFeedback && setOpenId(session.id)}
            disabled={!hasFeedback}
            className={cn(
              "w-full text-start rounded-2xl border border-border p-4 space-y-2 transition-colors shadow-[var(--shadow-card)]",
              hasFeedback
                ? "hover:bg-muted/40 cursor-pointer bg-card"
                : "bg-muted/30 cursor-default opacity-70"
            )}
          >
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={cn(
                  "text-xs font-semibold px-2 py-0.5 rounded-full",
                  TYPE_COLORS[session.session_type]
                )}
              >
                {TYPE_LABELS[session.session_type]}
              </span>
              {session.scenario_name && (
                <span className="text-xs text-muted-foreground">{session.scenario_name}</span>
              )}
              <span className="text-xs text-muted-foreground me-auto">
                {relativeDate(session.started_at)}
              </span>
              {!hasFeedback && (
                <span className="text-xs text-destructive/70 font-medium">לא הסתיים</span>
              )}
            </div>
            {preview && (
              <p className="text-xs text-muted-foreground line-clamp-1">{preview}</p>
            )}
          </button>
        );
      })}

      <Sheet open={!!openSession} onOpenChange={(o) => { if (!o) { stopTTS(); setOpenId(null); } }}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[80vh] overflow-y-auto">
          {openSession && (
            <>
              <SheetHeader className="text-start pb-4 border-b border-border">
                <SheetTitle className="font-black text-xl">
                  {openSession.scenario_name ?? TYPE_LABELS[openSession.session_type]}
                </SheetTitle>
                <div className="flex gap-4 text-sm text-muted-foreground">
                  <span>{formatDuration(openSession.started_at, openSession.ended_at)}</span>
                  <span>
                    {openSession.messages
                      ? `${Math.floor(openSession.messages.length / 2)} החלפות`
                      : ""}
                  </span>
                  <span>{TYPE_LABELS[openSession.session_type]}</span>
                </div>
              </SheetHeader>

              <div className="pt-4 space-y-4">
                <pre className="text-sm leading-relaxed whitespace-pre-wrap font-sans">
                  {openSession.feedback_text}
                </pre>

                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 rounded-xl"
                  onClick={() =>
                    isPlaying
                      ? stopTTS()
                      : playTTS(openSession.feedback_text!, "he")
                  }
                >
                  <Volume2 className={cn("size-4", isPlaying && "animate-pulse")} />
                  {isPlaying ? "עצור" : "השמע פידבק בעברית"}
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
```

- [ ] **Step 2: Add session history query and component to page.tsx**

In `app/ai-practice/page.tsx`, add the session query inside `AIPracticePage`:

After the `const supabase = await createClient();` line, add the user fetch and session query. Add after the existing scenarios query:

```tsx
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: sessionsData } = await supabase
    .from("ai_sessions")
    .select(
      `id, session_type, started_at, ended_at, feedback_text, messages,
       scenarios!left (name)`
    )
    .eq("user_id", user!.id)
    .order("started_at", { ascending: false })
    .limit(20);

  const sessions = (sessionsData ?? []).map((s: Record<string, unknown>) => ({
    id: s.id as string,
    session_type: s.session_type as "scenario" | "free_practice" | "free_conversation",
    started_at: s.started_at as string,
    ended_at: s.ended_at as string | null,
    feedback_text: s.feedback_text as string | null,
    messages: s.messages as { role: string; content: string }[] | null,
    scenario_name: (s.scenarios as { name?: string } | null)?.name ?? null,
  }));
```

Import `SessionHistory` at the top:
```tsx
import { SessionHistory } from "./session-history";
```

Add `<SessionHistory sessions={sessions} />` at the bottom of the JSX, after the scenarios list:

```tsx
        {/* Session history */}
        <SessionHistory sessions={sessions} />
```

- [ ] **Step 3: Verify**

Open http://localhost:3000/ai-practice. After the scenario list, a "שיחות אחרונות" section appears. Completed sessions show feedback preview; incomplete ones show "לא הסתיים". Tap a completed session → Sheet slides up with full feedback and Hebrew TTS button.

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add app/ai-practice/session-history.tsx app/ai-practice/page.tsx
git commit -m "feat: add session history — recent sessions with Sheet detail and Hebrew TTS"
```

---

## Task 11: Vocabulary Page

**Files:**
- Modify: `app/vocabulary/page.tsx`

- [ ] **Step 1: Rewrite the vocabulary page JSX**

Replace the entire file:

```tsx
export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { StudentShell } from "@/components/student-shell";
import { CATEGORY_LABELS, type VocabularyCategory } from "@/types";
import { AudioPlayer } from "./audio-player";
import { VocabularySearchBar } from "./search-bar";
import { cn } from "@/lib/utils";

interface PageProps {
  searchParams: Promise<{ q?: string; cat?: string }>;
}

const CATEGORY_COLORS: Record<string, string> = {
  all: "bg-primary text-primary-foreground",
  security: "bg-primary text-primary-foreground",
  daily: "bg-teal-500 text-white",
  checkpoint: "bg-indigo-500 text-white",
  interrogation: "bg-amber-500 text-white",
  other: "bg-muted text-muted-foreground",
};

export default async function VocabularyPage({ searchParams }: PageProps) {
  const { q, cat } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("vocabulary")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  if (q?.trim()) {
    query = query.or(
      `arabic_text.ilike.%${q}%,hebrew_translation.ilike.%${q}%,transliteration.ilike.%${q}%`
    );
  }

  if (cat && cat !== "all") {
    query = query.eq("category", cat);
  }

  const { data: wordsData } = await query;
  const words = wordsData ?? [];

  const categories = ["all", ...Object.keys(CATEGORY_LABELS)] as const;
  const activeCat = cat && cat !== "all" ? cat : "all";

  return (
    <StudentShell>
      <div className="p-4 max-w-lg mx-auto space-y-4">
        <h1 className="text-3xl font-black pt-2">אוצר מילים</h1>

        {/* Search */}
        <VocabularySearchBar defaultValue={q} />

        {/* Category tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {categories.map((c) => {
            const isActive = c === activeCat;
            return (
              <a key={c} href={`/vocabulary?${q ? `q=${q}&` : ""}cat=${c}`}>
                <span
                  className={cn(
                    "inline-block px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors cursor-pointer",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/70"
                  )}
                >
                  {c === "all" ? "הכל" : CATEGORY_LABELS[c as VocabularyCategory]}
                </span>
              </a>
            );
          })}
        </div>

        {/* Word count */}
        <p className="text-xs text-muted-foreground">
          {q ? `נמצאו ${words.length} מילים` : `${words.length} מילים`}
        </p>

        {/* Results */}
        {words.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>לא נמצאו מילים{q ? ` עבור "${q}"` : ""}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {words.map((word) => (
              <div
                key={word.id}
                className="rounded-2xl border border-border bg-card p-4 space-y-2 shadow-[var(--shadow-card)]"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5 flex-1">
                    <p
                      className="text-2xl font-bold"
                      dir="rtl"
                      lang="ar"
                      style={{ fontFamily: "var(--font-noto-arabic)" }}
                    >
                      {word.arabic_text}
                    </p>
                    {word.transliteration && (
                      <p className="text-sm text-muted-foreground italic" dir="ltr">
                        {word.transliteration}
                      </p>
                    )}
                  </div>
                  {word.recording_path && (
                    <div className="shrink-0">
                      <AudioPlayer filePath={word.recording_path} />
                    </div>
                  )}
                </div>

                <p className="text-base font-semibold">{word.hebrew_translation}</p>

                {word.inflections && Object.keys(word.inflections).length > 0 && (
                  <details className="text-sm text-muted-foreground">
                    <summary className="cursor-pointer font-medium text-primary text-xs">
                      גזרות
                    </summary>
                    <div className="mt-2 space-y-0.5 border-t border-border pt-2">
                      {Object.entries(word.inflections as Record<string, string>).map(
                        ([k, v]) => (
                          <p key={k}>
                            <span className="font-medium">{k}:</span>{" "}
                            <span
                              dir="rtl"
                              lang="ar"
                              style={{ fontFamily: "var(--font-noto-arabic)" }}
                            >
                              {v}
                            </span>
                          </p>
                        )
                      )}
                    </div>
                  </details>
                )}

                {word.category && (
                  <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                    {CATEGORY_LABELS[word.category as VocabularyCategory]}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </StudentShell>
  );
}
```

- [ ] **Step 2: Verify**

Open http://localhost:3000/vocabulary. Category tabs are pill-shaped, active one is orange. Word cards have `rounded-2xl`, Noto Naskh Arabic text, collapsible inflections via `<details>`. No TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add app/vocabulary/page.tsx
git commit -m "feat: vocabulary — rounded cards, orange category pills, Noto Naskh Arabic"
```

---

## Task 12: Leaderboard

**Files:**
- Modify: `app/leaderboard/page.tsx`

- [ ] **Step 1: Update leaderboard page styling**

Find and replace the podium section and full table in `app/leaderboard/page.tsx`.

Replace the `{/* Podium */}` section (lines 144–179 approximately) with:

```tsx
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
```

Replace the `<tr>` rows in the full table to highlight current user:

```tsx
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
                              <span className="mr-2 text-xs text-primary font-normal">(אתה)</span>
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
```

Also update the period tabs to use orange pills:

```tsx
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
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
```

And the header to use larger title:

```tsx
        <div className="pt-4 flex items-center gap-3">
          <Trophy className="size-8 text-amber-500" strokeWidth={2} />
          <div>
            <h1 className="text-3xl font-black">לוח המצטיינים</h1>
            {myEntry && (
              <p className="text-sm text-muted-foreground">
                הדירוג שלך: #{myEntry.rank} · {myEntry.total_points.toLocaleString("he-IL")} נקודות
              </p>
            )}
          </div>
        </div>
```

- [ ] **Step 2: Verify**

Open http://localhost:3000/leaderboard. Period tabs are orange pills. Podium shows avatar initials in circles. Current user row has light orange `bg-primary/10` background and orange text. No TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add app/leaderboard/page.tsx
git commit -m "feat: leaderboard — avatar circles, orange period pills, orange current-user row"
```

---

## Task 13: Admin Shell — Orange Active State

**Files:**
- Modify: `components/admin-shell.tsx`

- [ ] **Step 1: Update NavLinks active class in admin-shell.tsx**

Find the `className` on the `<Link>` inside `NavLinks` (around line 44):

```tsx
              pathname.startsWith(href)
                ? "bg-foreground text-background font-medium"
                : "text-muted-foreground hover:bg-muted hover:text-foreground font-normal"
```

Replace with:

```tsx
              pathname.startsWith(href)
                ? "bg-primary text-primary-foreground font-medium"
                : "text-muted-foreground hover:bg-primary/5 hover:text-foreground font-normal"
```

- [ ] **Step 2: Verify**

Open http://localhost:3000/admin/dashboard. The active sidebar item should have an orange background with white text. Inactive items show a very light orange tint on hover. No layout changes.

- [ ] **Step 3: Commit**

```bash
git add components/admin-shell.tsx
git commit -m "feat: admin sidebar — orange active state"
```

---

## Done

All tasks complete. The app now has:
- Vibrant orange primary throughout (buttons, nav, borders, highlights)
- Noto Naskh Arabic font for authentic Arabic text
- Animated splash loader on first visit
- Elevated orange Practice button in center of bottom nav
- Orange gradient login page with floating card
- XP + rank card on home dashboard
- Fullscreen dark orb for all three voice conversation screens
- Mode cards with colored left accent bars on AI practice hub
- Session history section with Sheet detail and Hebrew TTS
- Noto Naskh vocabulary cards with orange category pills
- Leaderboard with avatar circles and orange current-user highlight
- Admin sidebar with orange active state
