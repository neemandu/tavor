export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { StudentShell } from "@/components/student-shell";
import { FreeChatInterface } from "./free-chat-interface";
import { redirect } from "next/navigation";

export default async function FreePracticePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <StudentShell>
      <FreeChatInterface userId={user.id} />
    </StudentShell>
  );
}
