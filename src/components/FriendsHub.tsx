import Link from "next/link";
import { Avatar } from "./Avatar";
import { CoverImage } from "./CoverImage";
import { ScoreBadge } from "./ScoreBadge";
import { formatScore, timeAgo } from "@/lib/utils";
import type { FriendsHub as HubData, CircleAlbum } from "@/lib/friends-hub";
import type { QueueStatus } from "@/lib/listening-queue";
import { ListeningQueueControl } from "./ListeningQueueControl";

function ListenerLabel({ pick }: { pick: CircleAlbum }) {
  const first = pick.listeners[0];
  return <span>{pick.listeners.length === 1 ? first.name : `${first.name} + ${pick.listeners.length - 1}`} · {formatScore(pick.average)}/10</span>;
}

export function FriendsHub({ data, friendCount, unavailable = false, savedQueue = {} }: { data: HubData; friendCount: number; unavailable?: boolean; savedQueue?: Record<string, QueueStatus> }) {
  const hasDiscovery = data.discoveries.length > 0;
  return <div className="space-y-7">
    {unavailable && <p role="status" className="rounded-xl bg-accent-soft px-4 py-3 text-sm text-accent">Music insights couldn&apos;t load. Your friend controls are still available—reload to try again.</p>}
    <section aria-labelledby="friend-discoveries" className="surface-panel overflow-hidden">
      <div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
        <div className="max-w-sm">
          <p className="mb-3 text-xs font-semibold tracking-widest text-accent uppercase">From their shelves to yours</p>
          <h2 id="friend-discoveries" className="font-serif text-3xl leading-tight tracking-tight text-ink sm:text-4xl">
            Your next favourite<br className="hidden sm:block" /> might be here.
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted">{hasDiscovery ? "Albums your friends rate 8 or higher on average, and you haven’t scored yet." : friendCount ? "As your friends share ratings, their favourites and your next listens will appear here." : "Add a friend to discover their favourite albums, compare your scores and find something new."}</p>
          {!hasDiscovery && <a href="#find-friends" className="btn btn-outline mt-5">{friendCount ? "Find more friends" : "Find a friend"}</a>}
        </div>
        {hasDiscovery ? <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {data.discoveries.map((pick, index) => <div key={pick.album.id} className="min-w-0"><Link href={`/album/${pick.album.id}`} className="group block min-w-0">
            <div className="relative aspect-square overflow-hidden rounded-xl bg-ivory shadow-[var(--shadow-soft)]">
              <CoverImage url={pick.album.cover_image_url} alt={`${pick.album.title} cover`} priority={index < 2} className="h-full w-full transition-transform duration-300 motion-reduce:transition-none group-hover:scale-[1.03]" />
              <span className="absolute right-2 bottom-2 rounded-full bg-ink px-2.5 py-1 text-xs font-semibold text-paper">{formatScore(pick.average)}<span className="font-normal text-paper/65"> / 10</span></span>
            </div>
            <p className="mt-2 truncate text-sm font-semibold text-ink">{pick.album.title}</p>
            <p className="truncate text-xs text-muted">{pick.album.artist}</p>
            <p className="mt-1 truncate text-xs text-body"><ListenerLabel pick={pick} /></p>
          </Link><div className="mt-2"><ListeningQueueControl compact albumId={pick.album.id} initialStatus={savedQueue[pick.album.id] ?? null} /></div></div>)}
        </div> : <div className="flex min-h-48 items-center justify-center rounded-xl bg-ivory p-6 text-center">
          <div><span aria-hidden="true" className="block font-serif text-6xl text-accent/50">♫</span><p className="mt-4 text-sm font-medium text-ink">Good music travels between friends.</p><p className="mt-1 text-xs text-muted">Discoveries start with their shared scores.</p></div>
        </div>}
      </div>
    </section>

    <div className="grid gap-7 lg:grid-cols-[1.15fr_0.85fr]">
      <section aria-labelledby="circle-favourites" className="space-y-3">
        <div><h2 id="circle-favourites" className="font-serif text-xl font-semibold text-ink">Loved in your circle</h2><p className="mt-1 text-sm text-muted">Highly rated albums, with the people behind the scores.</p></div>
        {data.favourites.length ? <div className="surface-panel divide-y divide-line">
          {data.favourites.map((pick) => <Link key={pick.album.id} href={`/album/${pick.album.id}`} className="flex min-w-0 items-center gap-3 rounded-xl p-3 transition-colors hover:bg-ivory sm:p-4">
            <CoverImage url={pick.album.cover_image_url} alt="" className="h-14 w-14 shrink-0 rounded-lg" />
            <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-ink">{pick.album.title}</p><p className="truncate text-xs text-muted">{pick.album.artist}</p><p className="mt-1 truncate text-xs text-body"><ListenerLabel pick={pick} /></p></div>
            <div aria-hidden="true" className="hidden -space-x-2 sm:flex">{pick.listeners.slice(0, 3).map((person) => <span key={person.id} className="rounded-full ring-2 ring-surface"><Avatar url={person.avatar} name={person.name} size={26} /></span>)}</div>
          </Link>)}
        </div> : <p className="rounded-xl bg-ivory/60 p-5 text-sm leading-relaxed text-muted">No shared favourites yet. Albums appear here once a friend scores them 8 or higher.</p>}
      </section>

      <section aria-labelledby="recent-friend-ratings" className="space-y-3">
        <div><h2 id="recent-friend-ratings" className="font-serif text-xl font-semibold text-ink">Latest scores</h2><p className="mt-1 text-sm text-muted">What your friends have been rating.</p></div>
        {data.recent.length ? <div className="surface-panel divide-y divide-line">
          {data.recent.map((entry) => <div key={`${entry.person.id}:${entry.album.id}`} className="flex items-center gap-3 p-3 sm:p-4">
            <Link href={`/friends/${entry.person.id}`} aria-label={`View ${entry.person.name}`} className="shrink-0"><Avatar url={entry.person.avatar} name={entry.person.name} size={34} /></Link>
            <div className="min-w-0 flex-1"><p className="truncate text-xs text-muted"><Link href={`/friends/${entry.person.id}`} className="font-medium text-ink hover:underline">{entry.person.name}</Link> rated</p><Link href={`/album/${entry.album.id}`} className="block truncate text-sm font-medium text-ink hover:underline">{entry.album.title}</Link><time dateTime={entry.at} className="text-xs text-muted">{timeAgo(entry.at)}</time></div>
            <ScoreBadge score={entry.score} className="shrink-0 text-lg" />
          </div>)}
        </div> : <p className="rounded-xl bg-ivory/60 p-5 text-sm leading-relaxed text-muted">Shared ratings will show up here. Private ratings stay private.</p>}
      </section>
    </div>

    {data.split && <section aria-labelledby="biggest-split" className="flex flex-col gap-4 rounded-2xl border border-line bg-ivory/50 p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-4"><CoverImage url={data.split.album.cover_image_url} alt="" className="h-16 w-16 shrink-0 rounded-lg" /><div className="min-w-0"><h2 id="biggest-split" className="text-xs font-semibold tracking-wide text-accent uppercase">Agree to disagree</h2><p className="mt-1 truncate font-serif text-xl font-semibold text-ink">{data.split.album.title}</p><p className="mt-1 text-sm text-muted">You: <span className="font-semibold text-ink">{formatScore(data.split.mine)}</span> · {data.split.person.name}: <span className="font-semibold text-ink">{formatScore(data.split.theirs)}</span></p></div></div>
      <Link href={`/album/${data.split.album.id}/compare/${data.split.person.id}`} className="btn btn-outline shrink-0">Compare track by track →</Link>
    </section>}
    <p className="text-xs leading-relaxed text-muted">Based on ratings your accepted friends share with you. Album score match appears after three shared albums; it measures score agreement, not identical music taste.</p>
  </div>;
}
