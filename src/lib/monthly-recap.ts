import type { HubAlbum, HubPerson, HubRating } from "./friends-hub";
import type { MonthlyFavorite } from "./monthlyFavorites";

export type RecapRating = HubRating & { favorite_track: {id:string;name:string} | null };
export type RecapPick = Pick<MonthlyFavorite,"id"|"title"|"artist"|"position">;
function score(value: number | string | null): number | null {
  if(value==null || value==="") return null;
  const n=Number(value);return Number.isFinite(n)&&n>=0&&n<=10?n:null;
}
export function buildMonthlyRecap(ownerId: string, month: string, rows: RecapRating[], picks: RecapPick[], people: HubPerson[], friendRows: HubRating[]) {
  const [year,m]=month.split("-").map(Number);
  const start=Date.UTC(year,m-1,1),end=Date.UTC(year,m,1);
  const mine=new Map<string,RecapRating>();
  for(const row of [...rows].sort((a,b)=>b.updated_at.localeCompare(a.updated_at))) {
    const at=Date.parse(row.updated_at);
    if(row.user_id===ownerId&&row.album&&score(row.overall_rating)!==null&&at>=start&&at<end&&!mine.has(row.album_id)) mine.set(row.album_id,row);
  }
  const albums=[...mine.values()].sort((a,b)=>score(b.overall_rating)!-score(a.overall_rating)!||a.album!.title.localeCompare(b.album!.title));
  const average=albums.length?albums.reduce((n,row)=>n+score(row.overall_rating)!,0)/albums.length:null;
  const seenTracks=new Set<string>();
  const tracks=albums.flatMap(row=>{
    if(!row.favorite_track||seenTracks.has(row.favorite_track.id))return [];
    seenTracks.add(row.favorite_track.id);
    return [{id:row.favorite_track.id,title:row.favorite_track.name,artist:row.album!.artist,album:row.album!.title}];
  }).slice(0,5);
  const names=new Map(people.map(person=>[person.id,person]));
  const seenScores=new Set<string>();
  const disagreements: {album:HubAlbum;person:HubPerson;mine:number;theirs:number;gap:number}[]=[];
  for(const row of [...friendRows].sort((a,b)=>b.updated_at.localeCompare(a.updated_at))) {
    const person=names.get(row.user_id), own=mine.get(row.album_id), theirs=score(row.overall_rating),key=row.user_id+":"+row.album_id;
    if(!person||!own||theirs===null||seenScores.has(key))continue;
    seenScores.add(key);
    const myScore=score(own.overall_rating)!,gap=Math.abs(myScore-theirs);
    if(gap>=2)disagreements.push({album:own.album!,person,mine:myScore,theirs,gap});
  }
  disagreements.sort((a,b)=>b.gap-a.gap||a.album.title.localeCompare(b.album.title)||a.person.name.localeCompare(b.person.name));
  return {albums,average,tracks,picks:[...picks].sort((a,b)=>a.position-b.position).slice(0,5),disagreements:disagreements.slice(0,3)};
}
