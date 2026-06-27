export const dynamic = "force-dynamic";

import { StudentShell } from "@/components/student-shell";
import { loadLettersPlaylist } from "@/lib/letters-video-config";
import { LettersVideoPlayer } from "./letters-video-player";

export default async function LettersVideosPage() {
  const { playlistId } = await loadLettersPlaylist();

  return (
    <StudentShell>
      <div className="p-4 max-w-2xl mx-auto space-y-5">
        <div className="pt-2">
          <h1 className="text-xl font-bold">לימוד אותיות מסרטונים</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            בחר אות מהרשימה — כל סרטון מלמד אות אחרת
          </p>
        </div>

        {playlistId ? (
          <LettersVideoPlayer playlistId={playlistId} />
        ) : (
          <div className="rounded-xl border bg-muted p-6 text-center text-sm text-muted-foreground">
            הסרטונים אינם זמינים כרגע.
          </div>
        )}
      </div>
    </StudentShell>
  );
}
