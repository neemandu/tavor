import { createAdminClient } from "@/lib/supabase/server";
import {
  LETTERS_PLAYLIST_KEY,
  DEFAULT_PLAYLIST_URL,
  extractPlaylistId,
  buildPlaylistEmbedUrl,
} from "@/lib/letters-video";

// Server-only loaders for the configurable letters playlist (stored in
// app_config). Pure helpers/constants live in lib/letters-video.ts — import
// those from client components, not this file (it pulls in next/headers).

// Re-exported for server-side importers that already use this module.
export {
  LETTERS_PLAYLIST_KEY,
  DEFAULT_PLAYLIST_URL,
  extractPlaylistId,
  buildPlaylistEmbedUrl,
};

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
