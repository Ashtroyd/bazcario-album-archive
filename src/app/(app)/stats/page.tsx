import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { ScoreBadge } from "@/components/ScoreBadge";
import { StatBars } from "@/components/StatBars";
import {
  computeRatingStats,
  type GroupStat,
  type StatsAlbumRow,
} from "@/lib/stats";
import { formatScore } from "@/lib/utils";

export const metadata: Metadata = { title: "Stats" };

type RatingRow = {
  overall_rating: number | string | null;
  albums: {
    id: string;
    title: string;
    artist: string;
    genre: string | null;
    release_year: number | null;
  } | null;
};

type TrackRatingRow = {
  rating: number | string;
  replay_value: string | null;
};

export default async function StatsPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const [{ data: ratingsData }, { data: trackData }] = await Promise.all([
    supabase
      .from("ratings")
      .select("overall_rating, albums(id, title, artist, genre, release_year)")
      .eq("user_id", user.id),
    supabase
      .from("track_ratings")
      .select("rating, replay_value")
      .eq("user_id", user.id),
  ]);

  const albums: StatsAlbumRow[] = ((ratingsData ?? []) as unknown as RatingRow[])
    .filter((r) => r.albums)
    .map((r) => ({
      albumId: r.albums!.id,
      title: r.albums!.title,
      artist: r.albums!.artist,
      genre: r.albums!.genre,
      releaseYear: r.albums!.release_year,
      overall: r.overall_rating == null ? null : Number(r.overall_rating),
    }));
  const tracks = ((trackData ?? []) as TrackRatingRow[]).map((t) => ({
    rating: Number(t.rating),
    replayValue: t.replay_value,
  }));

  const stats = computeRatingStats(albums, tracks);

  const headline = [
    { label: "Albums scored", value: String(stats.scoredAlbumCount) },
    { label: "Tracks rated", value: String(stats.trackCount) },
    { label: "Avg album", value: formatScore(stats.albumAverage) },
    { label: "Median track", value: formatScore(stats.trackMedian) },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-bold text-ink">Stats</h1>
          <p className="text-sm text-muted">
            How you rate, worked out from every score you&apos;ve saved.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href="/api/export?format=csv" className="btn btn-outline text-sm" download>
            Export CSV
          </a>
          <a href="/api/export?format=xlsx" className="btn btn-outline text-sm" download>
            Export Excel
          </a>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {headline.map((s) => (
          <div key={s.label} className="card">
            <div className="eyebrow">{s.label}</div>
            <div className="mt-1 text-2xl font-bold text-ink">{s.value}</div>
          </div>
        ))}
      </div>

      {stats.scoredAlbumCount === 0 ? (
        <div className="card text-center text-sm text-muted">
          Rate a few album tracks and your stats will appear here.{" "}
          <Link href="/albums?scope=all" className="text-accent hover:underline">
            Browse albums →
          </Link>
        </div>
      ) : (
        <>
          <div className="grid gap-6 md:grid-cols-2">
            <Panel title="Album scores">
              <StatBars data={stats.albumDistribution} />
            </Panel>
            <Panel title="Track scores">
              <StatBars data={stats.trackDistribution} colorClass="bg-sage" />
            </Panel>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Panel title="Average by genre">
              <GroupTable rows={stats.byGenre} empty="Add genres to your albums to see this." />
            </Panel>
            <Panel title="Average by decade">
              <GroupTable rows={stats.byDecade} empty="Add release years to see this." />
            </Panel>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Panel title="Most-rated artists">
              <GroupTable rows={stats.topArtists} empty="No artists yet." />
            </Panel>
            <Panel title="Replay value">
              {stats.replayValues.some((r) => r.value > 0) ? (
                <StatBars
                  data={stats.replayValues}
                  colorClass="bg-star"
                  labelWidth="w-20"
                />
              ) : (
                <p className="text-sm text-muted">
                  Set replay value on tracks to see this.
                </p>
              )}
            </Panel>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Panel title="Your highest scores">
              <AlbumList rows={stats.best} />
            </Panel>
            {stats.worst.length > 0 && (
              <Panel title="Your lowest scores">
                <AlbumList rows={stats.worst} />
              </Panel>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card">
      <h2 className="mb-3 text-sm font-semibold text-ink">{title}</h2>
      {children}
    </section>
  );
}

function GroupTable({ rows, empty }: { rows: GroupStat[]; empty: string }) {
  if (!rows.length) return <p className="text-sm text-muted">{empty}</p>;
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-xs text-muted">
          <th className="pb-1 font-medium">Name</th>
          <th className="pb-1 text-right font-medium">Albums</th>
          <th className="pb-1 text-right font-medium">Avg</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.label} className="border-t border-line">
            <td className="max-w-0 truncate py-1.5 pr-2 text-ink" title={row.label}>
              {row.label}
            </td>
            <td className="py-1.5 text-right text-muted">{row.count}</td>
            <td className="py-1.5 text-right">
              <ScoreBadge score={row.average} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function AlbumList({ rows }: { rows: StatsAlbumRow[] }) {
  return (
    <ol className="space-y-2">
      {rows.map((row) => (
        <li key={row.albumId} className="flex items-center justify-between gap-3">
          <Link href={`/album/${row.albumId}`} className="min-w-0 hover:underline">
            <span className="block truncate text-sm font-medium text-ink">{row.title}</span>
            <span className="block truncate text-xs text-muted">{row.artist}</span>
          </Link>
          <ScoreBadge score={row.overall} />
        </li>
      ))}
    </ol>
  );
}
