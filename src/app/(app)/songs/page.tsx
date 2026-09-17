import { LibraryModeSwitch } from "@/components/LibraryModeSwitch";
import { SongRatingsManager } from "@/components/SongRatingsManager";
import { createClient } from "@/lib/supabase/server";
import { getMySongRatings } from "@/lib/songRatings";

export default async function SongsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const ratings = await getMySongRatings(supabase, user!.id);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-bold text-ink">Song ratings</h1>
          <p className="text-sm text-muted">Score individual songs without changing an album average.</p>
        </div>
        <LibraryModeSwitch active="songs" />
      </div>

      <SongRatingsManager ratings={ratings} />
    </div>
  );
}
