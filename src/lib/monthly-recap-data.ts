import type { SupabaseClient } from "@supabase/supabase-js";
import { recapBounds } from "./recap-month";
import { buildMonthlyRecap, type RecapRating, type RecapPick } from "./monthly-recap";
import type { HubPerson } from "./friends-hub";
import { loadHubRatings } from "./friends-hub-data";

export async function loadMonthlyRecap(client: SupabaseClient, ownerId: string, month: string) {
  const {start,end}=recapBounds(month);
  const rows: RecapRating[]=[];
  const scoresPromise=(async()=>{
    for(let offset=0;;offset+=1000){
      const {data,error}=await client.from("ratings")
        .select("user_id,album_id,overall_rating,updated_at,album:albums(id,title,artist,cover_image_url),favorite_track:tracks!ratings_favorite_track_id_fkey(id,name)")
        .eq("user_id",ownerId).not("overall_rating","is",null).gte("updated_at",start).lt("updated_at",end)
        .order("id").range(offset,offset+999).abortSignal(AbortSignal.timeout(8000));
      if(error)throw error;
      rows.push(...(data??[]) as unknown as RecapRating[]);
      if(!data||data.length<1000)return rows;
    }
  })();
  const picksPromise=client.from("monthly_favorites").select("id,title,artist,position").eq("user_id",ownerId).eq("month",month+"-01").order("position").abortSignal(AbortSignal.timeout(8000));
  // Friend insights can fail independently without hiding your own recap.
  const peoplePromise=(async()=>{
    const people: HubPerson[]=[];
    for(let offset=0;;offset+=1000){
      const {data,error}=await client.from("friendships").select("user_id,friend_id,requester:profiles!friendships_user_id_fkey(display_name),recipient:profiles!friendships_friend_id_fkey(display_name)")
        .eq("status","accepted").or(`user_id.eq.${ownerId},friend_id.eq.${ownerId}`).order("id").range(offset,offset+999).abortSignal(AbortSignal.timeout(8000));
      if(error)throw error;
      for(const row of data??[]){
        const p=(row.user_id===ownerId?row.recipient:row.requester) as unknown as {display_name:string|null}|null;
        people.push({id:row.user_id===ownerId?row.friend_id:row.user_id,name:p?.display_name??"Friend",avatar:null});
      }
      if(!data||data.length<1000)return people;
    }
  })().catch(()=>null);
  const [scores,pickResult,people]=await Promise.all([scoresPromise,picksPromise,peoplePromise]);
  if(pickResult.error)throw pickResult.error;
  let insightsUnavailable=people===null;
  const theirs=people?await loadHubRatings(client,people.map(p=>p.id),scores.map(row=>row.album_id)).catch(()=>{insightsUnavailable=true;return [];}):[];
  return {recap:buildMonthlyRecap(ownerId,month,scores,(pickResult.data??[]) as RecapPick[],people??[],theirs),insightsUnavailable};
}
