export const dynamic = "force-dynamic";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { ScenarioForm } from "./scenario-form";
import { ScenariosList } from "./scenarios-list";
import { type Scenario } from "@/types";

export default async function AdminScenariosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const adminSupabase = createAdminClient();
  const { data: scenariosData } = await adminSupabase
    .from("scenarios")
    .select("*")
    .order("created_at", { ascending: false });
  const scenarios = (scenariosData ?? []) as Scenario[];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">תרחישים AI</h1>

      <ScenarioForm userId={user!.id} />

      <ScenariosList scenarios={scenarios} />
    </div>
  );
}
