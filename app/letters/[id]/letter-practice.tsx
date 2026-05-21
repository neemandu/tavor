"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowRight, Trash2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { ArabicLetter } from "@/lib/arabic-letters";

interface LetterPracticeProps {
  letter: ArabicLetter;
  alreadyMastered: boolean;
}

const FORM_LABELS: Record<keyof ArabicLetter["forms"], string> = {
  isolated: "מבודדת",
  initial: "ראשונית",
  medial: "אמצעית",
  final: "סופית",
};

export function LetterPractice({ letter, alreadyMastered }: LetterPracticeProps) {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mastered, setMastered] = useState(alreadyMastered);

  // Initialize canvas with white background
  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  useEffect(() => {
    initCanvas();
  }, [initCanvas]);

  const getCanvasPoint = (
    canvas: HTMLCanvasElement,
    clientX: number,
    clientY: number
  ) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const startDrawing = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    isDrawingRef.current = true;
    const point = getCanvasPoint(canvas, clientX, clientY);
    lastPointRef.current = point;

    ctx.beginPath();
    ctx.arc(point.x, point.y, 1.5, 0, Math.PI * 2);
    ctx.fillStyle = "#000000";
    ctx.fill();
    setHasDrawn(true);
  }, []);

  const draw = useCallback((clientX: number, clientY: number) => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const point = getCanvasPoint(canvas, clientX, clientY);
    const last = lastPointRef.current;
    if (!last) return;

    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(point.x, point.y);
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();

    lastPointRef.current = point;
  }, []);

  const stopDrawing = useCallback(() => {
    isDrawingRef.current = false;
    lastPointRef.current = null;
  }, []);

  // Pointer events (handles both mouse and touch)
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    startDrawing(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    draw(e.clientX, e.clientY);
  };

  const handlePointerUp = () => {
    stopDrawing();
  };

  const handleClear = () => {
    initCanvas();
    setHasDrawn(false);
  };

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const res = await fetch("/api/letters/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ letter: letter.id }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "שגיאה בשמירה");
      }

      setMastered(true);
      toast.success(`כל הכבוד! האות "${letter.nameHe}" נשמרה!`);
      setTimeout(() => router.push("/letters"), 1200);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "שגיאה בשמירה");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 max-w-lg mx-auto space-y-5">
      {/* Back link */}
      <Link
        href="/letters"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowRight className="size-4" />
        חזרה לאותיות
      </Link>

      {/* Letter header */}
      <div className="flex items-center gap-4">
        <span
          className="text-7xl leading-none"
          dir="rtl"
          lang="ar"
          style={{ fontFamily: "var(--font-noto-arabic)" }}
        >
          {letter.arabic}
        </span>
        <div>
          <h1 className="text-2xl font-bold">{letter.nameHe}</h1>
          <p className="text-muted-foreground text-sm">{letter.pronunciation}</p>
          {mastered && (
            <p className="text-green-600 text-sm font-medium flex items-center gap-1 mt-1">
              <CheckCircle className="size-4" />
              שלטת באות זו
            </p>
          )}
        </div>
      </div>

      {/* Forms table */}
      <Card>
        <CardContent className="p-4">
          <p className="text-xs text-muted-foreground mb-3 font-medium">צורות האות</p>
          <div className="grid grid-cols-4 gap-2 text-center">
            {(Object.keys(FORM_LABELS) as Array<keyof ArabicLetter["forms"]>).map((formKey) => (
              <div key={formKey} className="space-y-1">
                <span
                  className="block text-2xl leading-none"
                  dir="rtl"
                  lang="ar"
                  style={{ fontFamily: "var(--font-noto-arabic)" }}
                >
                  {letter.forms[formKey]}
                </span>
                <span className="block text-[10px] text-muted-foreground">
                  {FORM_LABELS[formKey]}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Stroke hint */}
      <Card>
        <CardContent className="p-4">
          <p className="text-xs text-muted-foreground mb-1 font-medium">כיצד לכתוב</p>
          <p className="text-sm leading-relaxed">{letter.strokeHint}</p>
          {!letter.connects && (
            <p className="text-xs text-amber-600 mt-2">
              ⚠️ אות זו אינה מתחברת לאות הבאה משמאלה
            </p>
          )}
        </CardContent>
      </Card>

      {/* Canvas */}
      <div className="space-y-2">
        <p className="text-sm font-medium">תרגול כתיבה</p>
        <canvas
          ref={canvasRef}
          width={600}
          height={300}
          className="w-full rounded-xl border border-border bg-white cursor-crosshair touch-none"
          style={{ maxWidth: "100%" }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          onPointerCancel={handlePointerUp}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={handleClear}
          disabled={!hasDrawn}
          className="flex items-center gap-1.5"
        >
          <Trash2 className="size-4" />
          נקה
        </Button>
        <Button
          onClick={handleSave}
          disabled={saving || mastered}
          className="flex-1"
        >
          {mastered
            ? "כבר שלטת באות זו ✓"
            : saving
            ? "שומר..."
            : "סיימתי – שמור התקדמות"}
        </Button>
      </div>
    </div>
  );
}
