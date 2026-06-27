# Learn Arabic letters from videos

**Date:** 2026-06-27
**Status:** Approved

## Goal

Add a video-based way to learn the Arabic alphabet alongside the existing
recognition-practice engine. Videos play **inside** the web app, not on YouTube.

Source: the channel playlist
`https://www.youtube.com/playlist?list=PLtB1c2N6FHAFI_9KySJ5H9NskMsZUQBv4`
(each video teaches a different letter).

## Decisions

- **Presentation:** a single embedded YouTube **playlist** player (one player with
  the built-in next/prev sidebar). No YouTube Data API key, zero maintenance,
  self-updating when the channel adds videos.
- **Placement:** a dedicated page `/letters/videos`, reached from a secondary
  button on the `/letters` hub.

## Implementation

### New page — `app/letters/videos/page.tsx`
- Server component, `export const dynamic = "force-dynamic"`, wrapped in `StudentShell`.
- Header: title **"לימוד אותיות מסרטונים"**, subtitle **"כל אות מוסברת בסרטון קצר"**.
- Responsive 16:9 embedded player (static iframe — no client component needed):
  - URL: `https://www.youtube-nocookie.com/embed/videoseries?list=PLtB1c2N6FHAFI_9KySJ5H9NskMsZUQBv4`
  - Wrapper `aspect-video w-full rounded-xl overflow-hidden border`; iframe
    `allowFullScreen` + standard `allow` attributes.

### Entry point — edit `app/letters/page.tsx`
- Below the existing "תרגול זיהוי" CTA, add `<Link href="/letters/videos">` →
  `<Button variant="outline" size="lg">` with a lucide `Clapperboard` icon and
  label **"למידה מסרטונים"**.

## Admin configuration (added 2026-06-27)
The playlist is editable by admins, following the existing `app_config` +
`/admin/ai` precedent (no migration — reuses the `app_config` key/value table).

- **Config lib** `lib/letters-video-config.ts`: key `letters_playlist_url`,
  `DEFAULT_PLAYLIST_URL` (the original channel playlist), `extractPlaylistId()`
  (parses a `list=` URL or a raw id), `buildPlaylistEmbedUrl()`,
  `loadLettersPlaylist()` (effective embed URL, falls back to default),
  `loadLettersPlaylistRaw()` (for the editor).
- **Student page** now loads the configured playlist via `loadLettersPlaylist()`.
- **Admin page** `/admin/letters-videos`: paste a playlist URL, live in-app
  preview, save / reset-to-default. Registered in the admin nav (Clapperboard icon).
- **API** `PATCH /api/admin/letters-video`: admin-gated, validates the URL parses
  to a playlist id, upserts into `app_config`. Empty value clears the override.

## Out of scope (YAGNI)
- No points/gamification for watching.
- No per-letter video grid, no YouTube Data API key.

## Files
- New: `app/letters/videos/page.tsx`, `lib/letters-video-config.ts`,
  `app/admin/letters-videos/page.tsx`, `app/admin/letters-videos/letters-video-form.tsx`,
  `app/api/admin/letters-video/route.ts`
- Edit: `app/letters/page.tsx`, `components/admin-shell.tsx`
- No migrations (reuses `app_config`).
