import type { SupabaseClient } from "@supabase/supabase-js";
import type { HubAlbum } from "./friends-hub";
import type { QueueStatus } from "./listening-queue";

export type QueueEntry = { album_id: string; status: QueueStatus; album: HubAlbum | null };

export async function loadListeningQueue(client: SupabaseClient, userId: string): Promise<QueueEntry[]> {
  const rows: QueueEntry[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await client.from("album_listening_queue")
      .select("album_id,status,album:albums(id,title,artist,cover_image_url)")
      .eq("user_id", userId).order("updated_at", { ascending: false }).order("album_id")
      .range(offset, offset + 999).abortSignal(AbortSignal.timeout(8000));
    if (error) throw error;
    rows.push(...(data ?? []) as unknown as QueueEntry[]);
    if (!data || data.length < 1000) return rows;
  }
}
