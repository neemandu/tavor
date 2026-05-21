"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Volume2, VolumeX } from "lucide-react";

interface TTSButtonProps {
  text: string;
  lang?: string;
}

export function TTSButton({ text, lang = "he" }: TTSButtonProps) {
  const [speaking, setSpeaking] = useState(false);
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      setSupported(true);
    }
  }, []);

  const handleEnd = useCallback(() => {
    setSpeaking(false);
  }, []);

  function handleClick() {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.onend = handleEnd;
    utterance.onerror = handleEnd;

    setSpeaking(true);
    window.speechSynthesis.speak(utterance);
  }

  if (!supported) return null;

  return (
    <Button
      variant="outline"
      size="sm"
      className="gap-1.5"
      onClick={handleClick}
    >
      {speaking ? (
        <>
          <VolumeX className="size-4" />
          עצור קריאה
        </>
      ) : (
        <>
          <Volume2 className="size-4" />
          קרא בקול
        </>
      )}
    </Button>
  );
}
