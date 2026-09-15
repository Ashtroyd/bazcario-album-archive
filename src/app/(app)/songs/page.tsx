import { LibraryModeSwitch } from "@/components/LibraryModeSwitch";
import { SongRatingsManager } from "@/components/SongRatingsManager";
import { createClient } from "@/lib/supabase/server";
import type { Song, SongRating, SongWithMyRating } from "@/lib/types";

export default async function SongsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data } = await supabase
    .from("song_ratings")
    .select("*, song:songs(*)")
    .eq("user_id", user!.id)
    .order("updated_at", { ascending: false });

  const ratings = (data ?? []).flatMap((row) => {
    const song = row.song as unknown as Song | null;
    if (!song) return [];
    const rating: SongRating = {
      id: row.id as string,
      song_id: row.song_id as string,
      user_id: row.user_id as string,
      rating: Number(row.rating),
      replay_value: row.replay_value,
      notes: row.notes as string | null,
      updated_at: row.updated_at as string,
    };
    return [{ ...song, my_rating: rating } satisfies SongWithMyRating];
  });

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
