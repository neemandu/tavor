// Pure helpers/constants for the "learn letters from videos" feature.
// No server-only imports here, so this module is safe to import from client
// components. Server-side loaders live in letters-video-config.ts.

export const LETTERS_PLAYLIST_KEY = "letters_playlist_url";

// The original channel playlist (each video teaches a different letter).
export const DEFAULT_PLAYLIST_URL =
  "https://www.youtube.com/playlist?list=PLtB1c2N6FHAFI_9KySJ5H9NskMsZUQBv4";

// Extracts a YouTube playlist id from a full URL or a raw id.
// Returns null if no plausible playlist id is found.
export function extractPlaylistId(input: string): string | null {
  const raw = (input ?? "").trim();
  if (!raw) return null;

  // Full/partial URL with a list= query param.
  const match = raw.match(/[?&]list=([A-Za-z0-9_-]+)/);
  if (match) return match[1];

  // Raw playlist id pasted on its own (PL…, UU…, OL…, FL…, RD…, etc.).
  if (/^[A-Za-z0-9_-]{12,}$/.test(raw)) return raw;

  return null;
}

// Builds the in-app, privacy-friendly embed URL for a playlist id.
export function buildPlaylistEmbedUrl(playlistId: string): string {
  return `https://www.youtube-nocookie.com/embed/videoseries?list=${playlistId}`;
}
