import { saveRatingMeta } from "@/app/actions/ratings";
import type { Rating, Track } from "@/lib/types";

export function RatingMetaForm({
  albumId,
  tracks,
  rating,
}: {
  albumId: string;
  tracks: Track[];
  rating: Rating | null;
}) {
  return (
    <form action={saveRatingMeta} className="card space-y-3">
      <input type="hidden" name="album_id" value={albumId} />

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="first_listen_date">
            First listen
          </label>
          <input
            id="first_listen_date"
            type="date"
            name="first_listen_date"
            defaultValue={rating?.first_listen_date ?? ""}
            className="input"
          />
        </div>
        <div className="hidden sm:block" />

        <div>
          <label className="label" htmlFor="favorite_track_id">
            Favorite track
          </label>
          <select
            id="favorite_track_id"
            name="favorite_track_id"
            defaultValue={rating?.favorite_track_id ?? ""}
            className="input"
          >
            <option value="">—</option>
            {tracks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="least_favorite_track_id">
            Least favorite
          </label>
          <select
            id="least_favorite_track_id"
            name="least_favorite_track_id"
            defaultValue={rating?.least_favorite_track_id ?? ""}
            className="input"
          >
            <option value="">—</option>
            {tracks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="label" htmlFor="notes">
          Album notes
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={2}
          defaultValue={rating?.notes ?? ""}
          placeholder="Overall thoughts…"
          className="input"
        />
      </div>

      <button type="submit" className="btn btn-primary">
        Save details
      </button>
    </form>
  );
}
