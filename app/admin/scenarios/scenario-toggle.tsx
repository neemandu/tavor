"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface Props {
  scenarioId: string;
  isActive: boolean;
}

export function ScenarioToggle({ scenarioId, isActive }: Props) {
  const [active, setActive] = useState(isActive);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function toggle() {
    setLoading(true);
    const newActive = !active;
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("scenarios")
        .update({ is_active: newActive })
        .eq("id", scenarioId);
      if (error) throw error;
      setActive(newActive);
      router.refresh();
    } catch {
      toast.error("שגיאה בעדכון");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className="shrink-0"
      aria-label={active ? "כבה תרחיש" : "הפעל תרחיש"}
    >
      <Badge
        variant={active ? "default" : "outline"}
        className="cursor-pointer text-xs"
      >
        {active ? "פעיל" : "לא פעיל"}
      </Badge>
    </button>
  );
}
