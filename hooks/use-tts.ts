"use client";

import { useRef, useState, useCallback } from "react";
import { toast } from "sonner";

function stripEmojis(text: string) {
  return text.replace(/\p{Emoji_Presentation}/gu, "").replace(/\p{Emoji}️/gu, "").trim();
}

export function useTTS() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioResolveRef = useRef<(() => void) | null>(null);
  const unlockedRef = useRef(false);
  // Queue of pre-fetched audio URL promises — starts fetching immediately on enqueue
  const queueRef = useRef<Promise<string | null>[]>([]);
  const processingRef = useRef(false);
  const controllerRef = useRef(new AbortController());
  const generationRef = useRef(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const fetchAudio = useCallback((text: string, showError = false): Promise<string | null> => {
    const { signal } = controllerRef.current;
    return fetch("/api/ai/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
      signal,
    })
      .then(async (res) => {
        if (!res.ok) {
          if (showError) toast.error("שגיאת TTS — בדוק את מפתח ElevenLabs");
          return null;
        }
        const blob = await res.blob();
        return URL.createObjectURL(blob);
      })
      .catch(() => null);
  }, []);

  const stop = useCallback(() => {
    generationRef.current++;
    controllerRef.current.abort();
    controllerRef.current = new AbortController();
    queueRef.current = [];
    processingRef.current = false;
    audioResolveRef.current?.();
    audioResolveRef.current = null;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  const drainQueue = useCallback(async (gen: number) => {
    while (queueRef.current.length > 0) {
      if (generationRef.current !== gen) return;

      const urlPromise = queueRef.current.shift()!;
      const url = await urlPromise;

      if (generationRef.current !== gen) {
        if (url) URL.revokeObjectURL(url);
        return;
      }

      if (!url) continue;

      setIsPlaying(true);
      await new Promise<void>((resolve) => {
        audioResolveRef.current = resolve;
        const audio = new Audio(url);
        audioRef.current = audio;
        const cleanup = () => {
          URL.revokeObjectURL(url);
          audioRef.current = null;
          audioResolveRef.current = null;
          resolve();
        };
        audio.onended = cleanup;
        audio.onerror = cleanup;
        audio.play().catch(cleanup);
      });
    }

    if (generationRef.current === gen) {
      processingRef.current = false;
      setIsPlaying(false);
    }
  }, []);

  // Enqueue a sentence — starts pre-fetching immediately in parallel
  const enqueue = useCallback((text: string) => {
    if (!stripEmojis(text)) return;
    queueRef.current.push(fetchAudio(text, false));
    if (!processingRef.current) {
      processingRef.current = true;
      setIsPlaying(true); // mark busy immediately so auto-loop doesn't fire before audio loads
      drainQueue(generationRef.current);
    }
  }, [fetchAudio, drainQueue]);

  // One-shot play (feedback, message replay) — clears queue first
  const play = useCallback((text: string, _lang = "ar") => {
    stop();
    if (!stripEmojis(text)) return;
    queueRef.current.push(fetchAudio(text, true));
    processingRef.current = true;
    setIsPlaying(true);
    drainQueue(generationRef.current);
  }, [stop, fetchAudio, drainQueue]);

  // Call this from a user-gesture handler (tap/click) to unlock audio on iOS.
  // iOS blocks audio.play() unless the AudioContext was resumed inside a gesture.
  const unlock = useCallback(() => {
    if (unlockedRef.current) return;
    unlockedRef.current = true;
    try {
      type WebkitWindow = Window & { webkitAudioContext?: typeof AudioContext };
      const AC = window.AudioContext ?? (window as WebkitWindow).webkitAudioContext;
      if (!AC) return;
      const ctx = new AC();
      const buf = ctx.createBuffer(1, 1, 22050);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(ctx.destination);
      src.start(0);
      src.onended = () => ctx.close();
    } catch { /* ignore */ }
  }, []);

  return { play, enqueue, stop, isPlaying, unlock };
}
