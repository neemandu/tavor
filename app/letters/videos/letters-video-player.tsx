"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

// Minimal typing for the bits of the YouTube IFrame API we use.
interface YTPlayer {
  getPlaylist?: () => string[] | null;
  getPlaylistIndex?: () => number;
  playVideoAt?: (index: number) => void;
  destroy?: () => void;
}
declare global {
  interface Window {
    YT?: { Player: new (el: Element, opts: unknown) => YTPlayer; PlayerState?: unknown };
    onYouTubeIframeAPIReady?: () => void;
  }
}

// Load the IFrame API script once per page and resolve when it's ready.
let apiPromise: Promise<Window["YT"]> | null = null;
function loadYouTubeApi(): Promise<Window["YT"]> {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (apiPromise) return apiPromise;
  apiPromise = new Promise((resolve) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve(window.YT);
    };
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(tag);
  });
  return apiPromise;
}

export function LettersVideoPlayer({ playlistId }: { playlistId: string }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const hydratedRef = useRef(false);
  const [videoIds, setVideoIds] = useState<string[]>([]);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    let cancelled = false;
    hydratedRef.current = false;
    setVideoIds([]);
    setCurrent(0);

    // The YouTube API replaces this node with an iframe; give it a throwaway child.
    const mount = document.createElement("div");
    mount.className = "h-full w-full";
    hostRef.current?.appendChild(mount);

    // getPlaylist() can be empty for a moment after the player is ready; poll briefly.
    function hydrate(attempt = 0) {
      if (cancelled || hydratedRef.current) return;
      const ids = playerRef.current?.getPlaylist?.() ?? [];
      if (ids && ids.length) {
        hydratedRef.current = true;
        setVideoIds(ids);
      } else if (attempt < 15) {
        setTimeout(() => hydrate(attempt + 1), 300);
      }
    }

    loadYouTubeApi()
      .then((YT) => {
        if (cancelled || !YT?.Player) return;
        playerRef.current = new YT.Player(mount, {
          width: "100%",
          height: "100%",
          playerVars: { listType: "playlist", list: playlistId, rel: 0, modestbranding: 1 },
          events: {
            onReady: () => hydrate(),
            onStateChange: () => {
              hydrate();
              const idx = playerRef.current?.getPlaylistIndex?.();
              if (typeof idx === "number" && idx >= 0) setCurrent(idx);
            },
          },
        });
      })
      .catch(() => {
        /* leave the list empty; the page shows a fallback */
      });

    return () => {
      cancelled = true;
      try {
        playerRef.current?.destroy?.();
      } catch {
        /* ignore */
      }
      playerRef.current = null;
      if (hostRef.current) hostRef.current.innerHTML = "";
    };
  }, [playlistId]);

  function play(index: number) {
    setCurrent(index);
    playerRef.current?.playVideoAt?.(index);
    hostRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="space-y-4">
      <div
        ref={hostRef}
        className="aspect-video w-full overflow-hidden rounded-xl border bg-black [&_iframe]:h-full [&_iframe]:w-full"
      />

      {videoIds.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">כל הסרטונים</h2>
            <span className="text-xs text-muted-foreground">{videoIds.length} סרטונים</span>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {videoIds.map((id, i) => (
              <button
                key={`${id}-${i}`}
                type="button"
                onClick={() => play(i)}
                aria-current={i === current}
                className={cn(
                  "group relative overflow-hidden rounded-lg border text-left transition active:scale-95",
                  i === current
                    ? "border-primary ring-2 ring-primary"
                    : "border-border hover:border-primary/50"
                )}
              >
                <div className="aspect-video w-full bg-muted">
                  {/* Thumbnails load without an API key. */}
                  <img
                    src={`https://i.ytimg.com/vi/${id}/mqdefault.jpg`}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                </div>
                <span className="absolute top-1 start-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-medium text-white">
                  {i + 1}
                </span>
                {i === current && (
                  <span className="absolute bottom-1 end-1 rounded bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground">
                    מתנגן
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
