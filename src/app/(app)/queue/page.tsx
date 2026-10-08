import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { listeningStage, QUEUE_LABELS, type QueueStatus, type ListeningStage } from "@/lib/listening-queue";
import { loadHubRatings } from "@/lib/friends-hub-data";
import { loadListeningQueue } from "@/lib/listening-queue-data";
import { CoverImage } from "@/components/CoverImage";
import { ScoreBadge } from "@/components/ScoreBadge";
import { ListeningQueueControl } from "@/components/ListeningQueueControl";
import { LibraryModeSwitch } from "@/components/LibraryModeSwitch";
import type { HubAlbum } from "@/lib/friends-hub";

export default async function ListeningQueuePage({ searchParams }: { searchParams: Promise<{ stage?: string; q?: string }> }) {
  const sp = await searchParams;
  const stage: ListeningStage = sp.stage === "listening" || sp.stage === "rated" ? sp.stage : "want";
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const queued: Awaited<ReturnType<typeof loadListeningQueue>> = [];
  let ratings: Awaited<ReturnType<typeof loadHubRatings>> = [];
  let failed = false;
  try {
    const [entries, scores] = await Promise.all([loadListeningQueue(supabase, user.id), loadHubRatings(supabase, [user.id])]);
    queued.push(...entries); ratings = scores;
  } catch { failed = true; }
  const scoreMap = new Map(ratings.map((row) => [row.album_id, Number(row.overall_rating)]));
  const groups: Record<ListeningStage, { album: HubAlbum; status: QueueStatus | null; score: number | null }[]> = { want: [], listening: [], rated: [] };
  for (const row of queued) {
    if (!row.album || listeningStage(row.status, scoreMap.get(row.album_id)) === "rated") continue;
    groups[row.status].push({ album: row.album, status: row.status, score: null });
  }
  for (const row of ratings) if (row.album && listeningStage(null, row.overall_rating) === "rated") groups.rated.push({ album: row.album, status: null, score: Number(row.overall_rating) });
  const q = (sp.q ?? "").trim().toLowerCase();
  const list = groups[stage].filter(({ album }) => !q || `${album.title} ${album.artist}`.toLowerCase().includes(q));
  return <div className="space-y-6"><header className="flex flex-wrap items-end justify-between gap-3"><div><p className="eyebrow">Your next listens</p><h1 className="font-serif text-3xl font-bold text-ink">Listening queue</h1><p className="mt-1 text-sm text-muted">Save a record for later. Press play when you’re ready.</p></div><LibraryModeSwitch active="queue" /></header>
    <nav aria-label="Listening stage" className="flex flex-wrap gap-2">{(["want", "listening", "rated"] as const).map((key) => <Link key={key} href={`/queue?${new URLSearchParams({ stage: key, ...(sp.q ? { q: sp.q } : {}) })}`} aria-current={stage === key ? "page" : undefined} className={`btn ${stage === key ? "btn-primary" : "btn-outline"}`}>{QUEUE_LABELS[key]} · {groups[key].length}</Link>)}</nav>
    <form className="flex gap-2"><input type="hidden" name="stage" value={stage}/><input name="q" defaultValue={sp.q ?? ""} aria-label="Search your listening queue" placeholder="Search album or artist…" className="input"/><button className="btn btn-outline" type="submit">Search</button></form>
    {failed ? <p role="status" className="rounded-xl bg-accent-soft p-5 text-sm text-accent">Your queue couldn’t load. Reload to try again.</p> : list.length ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{list.map(({ album, status, score }) => <article key={album.id} className="card space-y-4"><Link href={`/album/${album.id}`}><CoverImage url={album.cover_image_url} alt={`${album.title} cover`} className="aspect-square w-full rounded-xl"/><h2 className="mt-3 truncate font-serif text-xl font-semibold text-ink">{album.title}</h2><p className="truncate text-sm text-muted">{album.artist}</p></Link>{score !== null ? <div className="flex items-center justify-between"><ScoreBadge score={score}/><Link href={`/album/${album.id}`} className="text-sm text-accent">View your ratings →</Link></div> : <ListeningQueueControl albumId={album.id} initialStatus={status}/>}</article>)}</div> : <section className="surface-panel p-7 text-center"><h2 className="font-serif text-xl font-semibold text-ink">{q ? "No matching albums" : stage === "want" ? "Your next favourite starts here" : stage === "listening" ? "Nothing playing yet" : "Your rated albums will appear here"}</h2><p className="mx-auto mt-2 max-w-md text-sm text-muted">{q ? "Try another album or artist name." : stage === "want" ? "Use Save for later on your friends’ picks, or Want to listen on any album." : stage === "listening" ? "Move an album from Want to listen into Listening when you start it." : "An album moves here automatically as you score its tracks."}</p><Link href={stage === "listening" ? "/queue" : "/albums?scope=all"} className="btn btn-outline mt-4">{stage === "listening" ? "See saved albums" : "Browse albums"}</Link></section>}
    <p className="text-xs text-muted">Your queue is private. Rated status comes from your actual track scores; removing an album from the queue never deletes ratings or notes.</p>
  </div>;
}
