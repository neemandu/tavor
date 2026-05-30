export const dynamic = "force-dynamic";

import Link from "next/link";
import { Sparkles } from "lucide-react";
import { loadAiConfigRaw, DEFAULTS } from "@/lib/ai-config";
import { AiConfigForm } from "./ai-config-form";

export default async function AdminAiPage() {
  const raw = await loadAiConfigRaw();
  // Show the effective text (stored override, or the code default if unset).
  const effective = {
    ai_persona: raw.ai_persona || DEFAULTS.ai_persona,
    ai_free_practice: raw.ai_free_practice || DEFAULTS.ai_free_practice,
    ai_free_conversation: raw.ai_free_conversation || DEFAULTS.ai_free_conversation,
    ai_feedback: raw.ai_feedback || DEFAULTS.ai_feedback,
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-2">
        <Sparkles className="size-6" />
        <h1 className="text-2xl font-bold">הנחיות AI</h1>
      </div>
      <p className="text-sm text-muted-foreground">
        הגדר את אישיות הסוכן והתנהגותו. השינויים חלים על כל תרגול קולי וכתוב.
        הנחיות ספציפיות לכל תרחיש נמצאות תחת{" "}
        <Link href="/admin/scenarios" className="underline text-primary">
          תרחישים
        </Link>
        .
      </p>

      <AiConfigForm initial={effective} defaults={DEFAULTS} />
    </div>
  );
}
