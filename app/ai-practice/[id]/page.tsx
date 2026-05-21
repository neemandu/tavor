export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { StudentShell } from "@/components/student-shell";
import { VoiceChat } from "./voice-chat";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ScenarioChatPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: scenario } = await supabase
    .from("scenarios")
    .select("*")
    .eq("id", id)
    .eq("is_active", true)
    .single();

  if (!scenario) notFound();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <StudentShell>
      <VoiceChat scenario={scenario} userId={user!.id} />
    </StudentShell>
  );
}
