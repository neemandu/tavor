"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Conversation } from "@11labs/client";
import { toast } from "sonner";
import type { OrbState } from "@/components/voice-orb";

interface Options {
  signedUrl: string | null;
  systemPrompt?: string;
  onEnd: (conversationId: string) => void;
}

export function useConvai({ signedUrl, systemPrompt, onEnd }: Options) {
  const [orbState, setOrbState] = useState<OrbState>("idle");
  const [transcript, setTranscript] = useState("");
  const convRef = useRef<Awaited<ReturnType<typeof Conversation.startSession>> | null>(null);
  const convIdRef = useRef("");
  const endCalledRef = useRef(false);
  // Ref so startSession always reads the latest systemPrompt even when memoized
  const systemPromptRef = useRef(systemPrompt);
  systemPromptRef.current = systemPrompt;

  const startSession = useCallback(async (url: string) => {
    const prompt = systemPromptRef.current;
    setOrbState("loading");
    try {
      const conv = await Conversation.startSession({
        signedUrl: url,
        overrides: prompt ? { agent: { prompt: { prompt }, language: "ar" } } : undefined,
        onConnect: ({ conversationId }) => {
          convIdRef.current = conversationId;
          setOrbState("listening");
        },
        onModeChange: ({ mode }) => {
          setOrbState(mode === "speaking" ? "speaking" : "listening");
        },
        onMessage: ({ message, source }) => {
          if (source === "user") setTranscript(message);
          else setTranscript("");
        },
        onDisconnect: () => {
          setOrbState("idle");
          if (!endCalledRef.current && convIdRef.current) {
            endCalledRef.current = true;
            onEnd(convIdRef.current);
          }
        },
        onError: (msg) => {
          toast.error(typeof msg === "string" ? msg : "שגיאה בשיחה");
          setOrbState("idle");
        },
      });
      convRef.current = conv;
    } catch {
      toast.error("לא ניתן להתחבר לשיחה");
      setOrbState("idle");
    }
  }, [onEnd]);

  useEffect(() => {
    if (!signedUrl) return;
    endCalledRef.current = false;
    startSession(signedUrl);
    return () => { convRef.current?.endSession().catch(() => {}); };
  }, [signedUrl, startSession]);

  async function endSession() {
    if (endCalledRef.current) return;
    endCalledRef.current = true;
    await convRef.current?.endSession().catch(() => {});
    if (convIdRef.current) onEnd(convIdRef.current);
  }

  return { orbState, transcript, endSession };
}
