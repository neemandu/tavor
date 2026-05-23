# Complete UI Redesign — Tavor Arabic Ulpan
**Date:** 2026-05-23
**Status:** Approved
**Target:** Frontend implementation skill

## Vision

Transform the current generic zinc/white app into a high-energy language-learning product that feels like **Duolingo meets the IDF** — vibrant orange accent, bold typography, gamified progress indicators, and a fullscreen immersive voice conversation experience. Every screen should make students feel like they're leveling up, not doing homework.

---

## Design System

### Color Tokens (update `app/globals.css`)

```css
/* Light mode */
--primary: oklch(65% 0.22 40);          /* Vibrant orange #FF6B35 */
--primary-foreground: oklch(99% 0 0);   /* White */
--primary-hover: oklch(60% 0.22 40);    /* Darker orange on hover */

--background: oklch(100% 0 0);          /* Pure white */
--foreground: oklch(10% 0 0);           /* Near black */
--muted: oklch(96% 0 0);
--muted-foreground: oklch(50% 0 0);
--border: oklch(90% 0 0);
--card: oklch(99% 0 0);

/* Semantic */
--streak: oklch(65% 0.22 25);           /* Flame red-orange */
--xp: oklch(80% 0.18 85);              /* Gold/yellow */
--success: oklch(60% 0.22 145);        /* Duolingo green #58CC02 */

/* Dark mode */
--background: oklch(8% 0 0);           /* Near black */
--foreground: oklch(96% 0 0);
--muted: oklch(14% 0 0);
--card: oklch(12% 0 0);
--border: oklch(20% 0 0);
/* primary stays orange in dark mode */
```

### Typography

- Hebrew body: **Alef** (already installed) — increase base weight to 500
- Arabic text: **Noto Naskh Arabic** — upgrade from Noto Sans Arabic for more authentic feel
- Heading scale: `text-3xl font-black` for page titles, `text-xl font-bold` for section headers
- All Hebrew text: `dir="rtl"`, Arabic text: `dir="rtl" lang="ar"`

### Radius & Spacing

- Card radius: `rounded-2xl` (16px) — up from current `rounded-lg`
- Button radius: `rounded-xl` (12px)
- Input radius: `rounded-xl`
- Spacing: generous — `p-5` on cards, `gap-4` between cards

### Shadows

```css
--shadow-card: 0 2px 12px oklch(65% 0.22 40 / 0.08);   /* Warm orange tint */
--shadow-elevated: 0 8px 32px oklch(0% 0 0 / 0.12);
```

### Icons

Switch from stroke (Lucide defaults) to **filled** style where available. Use `strokeWidth={2.5}` on all Lucide icons for bolder appearance.

---

## Bottom Navigation (Student Shell)

File: `components/student-shell.tsx`

**Layout:** 5 tabs — Home | Practice | Vocabulary | Leaderboard | More

**Active state:** Filled orange icon + orange bold label + subtle orange dot below icon
**Inactive state:** Gray stroke icon + gray label

**Center tab (Practice):** Slightly elevated — `w-14 h-14` orange circle button with white mic icon, `shadow-elevated`, sits `-mt-4` above the nav bar. This is the entry point to AI conversation.

**Nav bar styling:**
- `bg-background border-t border-border`
- `h-16` (taller than current for comfort)
- No colored pill background — color lives only in the icon and label

---

## Screen-by-Screen Redesign

### 1. Login (`app/login/`)

- Full-bleed orange gradient header (`from-primary to-primary-hover`) — top 40% of screen
- Large bold logo: "תבור" in white `text-4xl font-black` centered
- Subtitle: "בית הספר לערבית" in white `text-lg opacity-80`
- White card floats over gradient for the form
- Input fields: `rounded-xl h-12 border-2 focus:border-primary`
- CTA button: full-width orange, `h-12 rounded-xl font-bold text-base`
- No ThemeToggle on login — keep it distraction-free

### 2. Home Dashboard (`app/page.tsx`)

**Header:**
- `"שלום, [שם]! 👋"` — `text-2xl font-black`
- Current streak badge inline: flame emoji + number + "ימים רצופים" in orange

**Streak + XP card** (replaces generic stats):
- Full-width card with orange left border accent
- Row: 🔥 Streak number | ⭐ XP total | 🏆 Rank (#N in leaderboard)
- XP progress bar (orange fill, rounded) toward next milestone
- `text-xs text-muted-foreground` label: "עוד X נקודות לרמה הבאה"

**Daily goal ring:**
- Circular SVG progress ring in orange
- Center text: "2/3" (sessions completed today)
- Label below: "יעד יומי"

**Quick actions** (2×2 grid of cards):
- "שיחה קולית" — mic icon, orange gradient background
- "מילים חדשות" — book icon, teal background
- "תרחיש" — target icon, indigo background
- "לוח הצלחות" — trophy icon, gold background
- Each card: `rounded-2xl p-4`, icon `size-8`, bold title, `text-sm` subtitle

**Recent activity strip** — 3 most recent session history cards (from the session history feature)

### 3. AI Practice Hub (`app/ai-practice/page.tsx`)

**Mode cards** (replace current plain cards):
- Each is `rounded-2xl p-5` with a colored left accent bar
- Icon: large `size-10` filled icon
- Title: `text-lg font-bold`
- Subtitle: `text-sm text-muted-foreground`
- "התחל" arrow button inline at bottom right
- Colors: Scenario = orange, Free Practice = teal, Free Conversation = indigo

**Session history section** (per session-history spec):
- "שיחות אחרונות" heading with count badge
- Compact cards per session (date, type badge, feedback preview)
- Sheet on tap

### 4. Voice Conversation — Fullscreen Immersive

**Applies to:** `app/ai-practice/[id]/voice-chat.tsx`, `app/ai-practice/free/free-chat-interface.tsx`, `app/ai-practice/conversation/conversation-interface.tsx`

**This is the signature screen of the app. It must feel premium.**

**Layout:** Full screen, dark background always (`bg-[#0A0A0A]` regardless of theme)

**Orb (center of screen):**
- Large circle `w-48 h-48` centered vertically
- Three states with CSS animations:
  - **Idle / waiting:** dim gray ring, static — `opacity-30`
  - **Listening (recording):** white/light glow, slow pulse — `animate-pulse` + white shadow `shadow-[0_0_60px_rgba(255,255,255,0.3)]`
  - **AI speaking:** orange glow, rhythmic scale animation — `shadow-[0_0_80px_rgba(255,107,53,0.6)]` + `animate-[breathe_1.5s_ease-in-out_infinite]`
  - **Loading:** muted orange, slow spin ring around orb
- Inner orb: gradient `from-primary/80 to-primary` in speaking state, `from-gray-600 to-gray-700` when idle

**State text** (below orb):
- `text-white text-lg font-semibold` centered
- "לחץ להתחלת שיחה" / "מקשיב..." / "ה-AI מדבר..." / "מעבד..."

**Transcript strip** (above orb, fades in/out):
- Last user utterance in `text-white/60 text-sm` — Arabic, RTL, centered
- Fades out 2 seconds after recording stops

**Controls (bottom):**
- Orb IS the mic button — tap it to start/interrupt/stop
- "סיים וקבל פידבק" — `text-white/50 text-sm underline` below the state text, tappable
- Header: minimal — back arrow + scenario name in `text-white/70`, transparent background

**Briefing phase:** Keep existing card-based layout but apply orange accent colors and `rounded-2xl` cards.

**Feedback phase:**
- Returns to normal (light/dark) background
- Large "✓" success animation on arrival
- Feedback card: `rounded-2xl p-5 bg-card shadow-card`
- TTS play button: orange, prominent
- "תרגול חדש" button: outline, full width

### 5. Vocabulary (`app/vocabulary/page.tsx`)

**Search bar:**
- `h-12 rounded-xl border-2 focus:border-primary pl-10` with search icon inside

**Category tabs:**
- Scrollable horizontal tabs, active tab: orange pill background
- Tab labels: "הכל" | "ביטחון" | "יומיומי" | "מחסום" | "חקירה"

**Word cards** (replaces current table/list):
- `rounded-2xl p-4 bg-card shadow-card`
- Large Arabic text: `text-2xl font-bold dir="rtl"` using Noto Naskh Arabic
- Transliteration: `text-sm text-muted-foreground`
- Hebrew translation: `text-base font-semibold`
- Inflections: collapsible section (chevron toggle)
- Audio play button: orange circle `w-10 h-10`, speaker icon

### 6. Leaderboard (`app/leaderboard/page.tsx`)

**Top 3 podium:**
- 1st place: center, tallest, gold crown icon, orange glow card
- 2nd place: left, silver
- 3rd place: right, bronze
- Each shows avatar initial, name, XP score

**Rest of rankings:**
- Numbered list rows: rank number | name | XP badge
- Current user row: orange background highlight

**Header:** "לוח המצטיינים" with trophy icon, week/month toggle

### 7. Letters (`app/letters/page.tsx`)

**Grid layout:** 3 columns of letter cards
- Each card: `rounded-2xl p-4 aspect-square flex-col items-center`
- Large letter: `text-4xl` Noto Naskh Arabic
- Mastery indicator: small colored dot (not started = gray, in progress = orange, mastered = green)
- Progress: filled ring around card border for mastered letters

### 8. Exams (`app/exams/page.tsx`)

**Exam cards** (replace list):
- `rounded-2xl p-4`
- Status badge: "ממתין" (orange) | "הוגש" (green) | "עבר זמנו" (red)
- Due date with calendar icon
- Grade badge (if graded): large score number in colored circle
- Download + Submit buttons inline

### 9. Enrichment (`app/enrichment/page.tsx`)

**Article cards:**
- `rounded-2xl overflow-hidden` with colored top accent bar per category
- Category colors: תרבות=teal | גיאוגרפיה=green | דת=indigo | לבנטינית=orange
- Title: `text-base font-bold`
- Preview text: 2 lines clamped

---

## Admin Shell

Admin is desktop-first. Changes are lighter:
- Sidebar active item: orange background instead of current foreground/background
- Table rows: `hover:bg-primary/5` on hover
- Action buttons: orange primary, outline secondary
- Stats cards on dashboard: add colored left border accent per metric type

No fullscreen orb, no gamification — admin needs clarity over personality.

---

## Animation Additions

Add to `app/globals.css`:

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
```

Use `celebrate` on feedback arrival (the ✓ icon and feedback card entrance).

---

## Implementation Notes for Frontend Skill

- The app uses **Tailwind v4** — use CSS variable tokens, not hardcoded colors
- **RTL is global** (`dir="rtl"` on `<html>`) — use `ms-`/`me-` for margins, `ps-`/`pe-` for padding
- **shadcn/ui** components are already installed — extend with `className`, don't replace
- **Dark mode** via `.dark` class on `<html>` — all color tokens already have dark variants, just update the values
- **`useTTS` hook** handles all audio — don't add browser `speechSynthesis`
- The voice conversation screens (fullscreen orb) should `overflow: hidden` the body to prevent scroll
- Orb states are driven by `isRecording`, `isPlaying`, `loading` props already in each interface component
- Fonts already loaded in `app/layout.tsx` — add Noto Naskh Arabic there

---

---

## App Launch Loader

A splash screen shown **once per session** when the student app first loads. Skipped on subsequent navigations within the same session (use `sessionStorage` flag).

**Component:** `components/tavor-loader.tsx` (client component)
**Placement:** Rendered in `app/layout.tsx` above the page content, absolutely positioned, `z-50`

### Animation Sequence (~2.2s total)

1. **0–0.4s** — Screen is dark (`bg-[#0A0A0A]`), orb fades in from scale 0.6 → 1.0 with orange glow
   ```css
   @keyframes orb-enter {
     from { transform: scale(0.6); opacity: 0; box-shadow: none; }
     to   { transform: scale(1);   opacity: 1; box-shadow: 0 0 80px oklch(65% 0.22 40 / 0.7); }
   }
   animation: orb-enter 0.4s ease-out forwards;
   ```

2. **0.4–0.8s** — Orb pulses (breathe animation, one cycle) to signal it's alive

3. **0.8–1.2s** — "תבור" fades in below the orb in `text-5xl font-black text-white`
   ```css
   @keyframes word-fade {
     from { opacity: 0; transform: translateY(8px); }
     to   { opacity: 1; transform: translateY(0); }
   }
   animation: word-fade 0.4s ease-out 0.8s forwards;
   ```

4. **1.2–1.6s** — Hold — orb + word visible together

5. **1.6–2.2s** — Both slide up and fade out together, revealing the page beneath
   ```css
   @keyframes loader-exit {
     from { opacity: 1; transform: translateY(0); }
     to   { opacity: 0; transform: translateY(-40px); }
   }
   animation: loader-exit 0.6s ease-in 1.6s forwards;
   ```

### Layout

```
[full screen dark bg]
      [orb  w-32 h-32  centered]
      [תבור  mt-6  text-5xl font-black text-white  centered]
```

Both orb and word are wrapped in a single `div` that receives the exit animation — they move as one unit.

### Behavior

- Check `sessionStorage.getItem('loader-shown')` on mount — if set, skip immediately (don't render)
- After exit animation completes, set `sessionStorage.setItem('loader-shown', '1')` and unmount
- No interaction during loader — it is not dismissible

### CSS Additions (globals.css)

```css
@keyframes orb-enter { ... }   /* as above */
@keyframes word-fade { ... }   /* as above */
@keyframes loader-exit { ... } /* as above */
```

---

## Out of Scope

- Onboarding flow / tutorial
- Push notifications
- Native animations library (use CSS keyframes only, no Framer Motion)
- Admin gamification
- Profile/avatar upload
