"use client";

import { useRef, useState, useCallback } from "react";
import { toast } from "sonner";

const SILENT_WAV =
  "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA=";

function stripEmojis(text: string) {
  return text.replace(/\p{Emoji_Presentation}/gu, "").replace(/\p{Emoji}️/gu, "").trim();
}

// Cache generated audio by text so repeated plays are instant. The TTS route
// uses a deterministic seed, so identical text → identical audio.
const blobCache = new Map<string, Blob>();

export function useTTS() {
  // One persistent <audio> element — unlock it once in a user gesture,
  // then reuse for all TTS so iOS never blocks subsequent plays.
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const audioResolveRef = useRef<(() => void) | null>(null);
  const queueRef = useRef<Promise<string | null>[]>([]);
  const processingRef = useRef(false);
  const controllerRef = useRef(new AbortController());
  const generationRef = useRef(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const getAudioEl = useCallback(() => {
    if (!audioElRef.current) {
      audioElRef.current = new Audio();
    }
    return audioElRef.current;
  }, []);

  const fetchAudio = useCallback((text: string, showError = false): Promise<string | null> => {
    const cached = blobCache.get(text);
    if (cached) return Promise.resolve(URL.createObjectURL(cached));

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
        blobCache.set(text, blob);
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
    const el = audioElRef.current;
    if (el) {
      el.pause();
      el.src = "";
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
      const el = getAudioEl();
      await new Promise<void>((resolve) => {
        audioResolveRef.current = resolve;
        const cleanup = () => {
          URL.revokeObjectURL(url);
          audioResolveRef.current = null;
          resolve();
        };
        el.onended = cleanup;
        el.onerror = cleanup;
        el.src = url;
        el.play().catch(cleanup);
      });
    }

    if (generationRef.current === gen) {
      processingRef.current = false;
      setIsPlaying(false);
    }
  }, [getAudioEl]);

  const enqueue = useCallback((text: string) => {
    if (!stripEmojis(text)) return;
    queueRef.current.push(fetchAudio(text, false));
    if (!processingRef.current) {
      processingRef.current = true;
      setIsPlaying(true);
      drainQueue(generationRef.current);
    }
  }, [fetchAudio, drainQueue]);

  const play = useCallback((text: string, _lang = "ar") => {
    stop();
    if (!stripEmojis(text)) return;
    queueRef.current.push(fetchAudio(text, true));
    processingRef.current = true;
    setIsPlaying(true);
    drainQueue(generationRef.current);
  }, [stop, fetchAudio, drainQueue]);

  // Must be called from a user-gesture handler (tap/click).
  // Plays a silent WAV on the persistent element to unlock it for iOS.
  const unlock = useCallback(() => {
    const el = getAudioEl();
    el.src = SILENT_WAV;
    el.play().catch(() => {});
  }, [getAudioEl]);

  return { play, enqueue, stop, isPlaying, unlock };
}
