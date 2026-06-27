import { createAdminClient } from "@/lib/supabase/server";

// Configurable YouTube playlist for the "learn letters from videos" page.
// Stored in app_config under LETTERS_PLAYLIST_KEY; blank falls back to the
// default playlist below, so the page keeps working until an admin changes it.

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

export type LettersPlaylist = {
  url: string; // the effective source URL (stored override or default)
  playlistId: string | null; // parsed id, or null if the stored value is invalid
  embedUrl: string | null; // ready-to-iframe URL, or null if unparseable
};

// Effective playlist config for the student page. Never throws — on any failure
// it falls back to the default playlist so videos keep playing.
export async function loadLettersPlaylist(): Promise<LettersPlaylist> {
  let url = DEFAULT_PLAYLIST_URL;
  try {
    const db = createAdminClient();
    const { data } = await db
      .from("app_config")
      .select("value")
      .eq("key", LETTERS_PLAYLIST_KEY)
      .maybeSingle();
    const stored = ((data?.value as string) ?? "").trim();
    if (stored) url = stored;
  } catch (err) {
    console.error("loadLettersPlaylist failed, using default:", err);
  }

  const playlistId = extractPlaylistId(url) ?? extractPlaylistId(DEFAULT_PLAYLIST_URL);
  return {
    url,
    playlistId,
    embedUrl: playlistId ? buildPlaylistEmbedUrl(playlistId) : null,
  };
}

// Raw stored value (for the admin editor): the override or "" if unset.
export async function loadLettersPlaylistRaw(): Promise<string> {
  try {
    const db = createAdminClient();
    const { data } = await db
      .from("app_config")
      .select("value")
      .eq("key", LETTERS_PLAYLIST_KEY)
      .maybeSingle();
    return ((data?.value as string) ?? "").trim();
  } catch (err) {
    console.error("loadLettersPlaylistRaw failed:", err);
    return "";
  }
}
