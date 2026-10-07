export type HubPerson = { id: string; name: string; avatar: string | null };
export type HubAlbum = { id: string; title: string; artist: string; cover_image_url: string | null };
export type HubRating = { user_id: string; album_id: string; overall_rating: number | string | null; updated_at: string; album: HubAlbum | null };
export type FriendInsight = { scoredAlbums: number; sharedAlbums: number; matchPct: number | null; average: number | null; favourite: HubAlbum | null };
export type CircleAlbum = { album: HubAlbum; average: number; listeners: HubPerson[] };
export type FriendsHub = {
  discoveries: CircleAlbum[];
  favourites: CircleAlbum[];
  recent: { person: HubPerson; album: HubAlbum; score: number; at: string }[];
  split: { person: HubPerson; album: HubAlbum; mine: number; theirs: number; gap: number } | null;
  insights: Record<string, FriendInsight>;
};

function validScore(value: HubRating["overall_rating"]): number | null {
  if (value == null || value === "") return null;
  const score = Number(value);
  return Number.isFinite(score) && score >= 0 && score <= 10 ? score : null;
}

/** Only accepted friends and rows visible under the viewer's RLS participate. */
export function buildFriendsHub(people: HubPerson[], myRatings: HubRating[], friendRatings: HubRating[]): FriendsHub {
  const peopleById = new Map(people.map((person) => [person.id, person]));
  const mine = new Map(myRatings.flatMap((row) => {
    const score = validScore(row.overall_rating);
    return score === null ? [] : [[row.album_id, score] as const];
  }));
  const perPerson = new Map<string, Map<string, { row: HubRating; score: number }>>();
  // Defensively deduplicate by user/album; the latest visible score wins.
  for (const row of [...friendRatings].sort((a, b) => b.updated_at.localeCompare(a.updated_at))) {
    const score = validScore(row.overall_rating);
    if (!peopleById.has(row.user_id) || !row.album || score === null) continue;
    const albums = perPerson.get(row.user_id) ?? new Map();
    if (!albums.has(row.album_id)) albums.set(row.album_id, { row, score });
    perPerson.set(row.user_id, albums);
  }
  const insights: Record<string, FriendInsight> = {};
  const grouped = new Map<string, { album: HubAlbum; total: number; listeners: HubPerson[] }>();
  const recent: FriendsHub["recent"] = [];
  let split: FriendsHub["split"] = null;
  for (const person of people) {
    const ratings = [...(perPerson.get(person.id)?.values() ?? [])];
    let total = 0, shared = 0, gapTotal = 0;
    let favourite: { album: HubAlbum; score: number } | null = null;
    for (const { row, score } of ratings) {
      const album = row.album!;
      total += score;
      if (!favourite || score > favourite.score) favourite = { album, score };
      const ownScore = mine.get(row.album_id);
      if (ownScore !== undefined) {
        shared++; const gap = Math.abs(ownScore - score); gapTotal += gap;
        if (gap >= 2 && (!split || gap > split.gap)) split = { person, album, mine: ownScore, theirs: score, gap };
      }
      const group = grouped.get(album.id) ?? { album, total: 0, listeners: [] };
      group.total += score; group.listeners.push(person); grouped.set(album.id, group);
      if (Number.isFinite(Date.parse(row.updated_at))) recent.push({ person, album, score, at: row.updated_at });
    }
    insights[person.id] = { scoredAlbums: ratings.length, sharedAlbums: shared,
      matchPct: shared >= 3 ? Math.round(100 * (1 - gapTotal / shared / 10)) : null,
      average: ratings.length ? total / ratings.length : null, favourite: favourite?.album ?? null };
  }
  const favourites = [...grouped.values()].map((group) => ({ album: group.album, average: group.total / group.listeners.length, listeners: group.listeners }))
    .filter((group) => group.average >= 8)
    .sort((a, b) => b.listeners.length - a.listeners.length || b.average - a.average || a.album.title.localeCompare(b.album.title));
  return { discoveries: favourites.filter((group) => !mine.has(group.album.id)).slice(0, 4), favourites: favourites.slice(0, 6),
    recent: recent.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 6), split, insights };
}
