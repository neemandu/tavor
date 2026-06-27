export const dynamic = "force-dynamic";

import { Clapperboard } from "lucide-react";
import { loadLettersPlaylistRaw, DEFAULT_PLAYLIST_URL } from "@/lib/letters-video-config";
import { LettersVideoForm } from "./letters-video-form";

export default async function AdminLettersVideosPage() {
  const stored = await loadLettersPlaylistRaw();
  // Show the effective URL (stored override, or the default if unset).
  const initialUrl = stored || DEFAULT_PLAYLIST_URL;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-2">
        <Clapperboard className="size-6" />
        <h1 className="text-2xl font-bold">סרטוני אותיות</h1>
      </div>
      <p className="text-sm text-muted-foreground">
        בחר את פלייליסט היוטיוב שממנו החניכים לומדים את האותיות. הסרטונים מוצגים בתוך
        האפליקציה בעמוד &quot;לימוד אותיות מסרטונים&quot;.
      </p>

      <LettersVideoForm initialUrl={initialUrl} />
    </div>
  );
}
