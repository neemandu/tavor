export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { StudentShell } from "@/components/student-shell";
import { ConversationInterface } from "./conversation-interface";
import { redirect } from "next/navigation";

export default async function ConversationPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <StudentShell>
      <ConversationInterface userId={user.id} />
    </StudentShell>
  );
}
