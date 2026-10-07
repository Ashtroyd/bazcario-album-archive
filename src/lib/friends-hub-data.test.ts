import assert from "node:assert/strict";
import test from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import { loadHubRatings } from "./friends-hub-data";

function fixture(pages: { data: unknown[] | null; error: unknown }[]) {
  const ranges: [number, number][] = [];
  const query = {
    select() { return query; }, in() { return query; }, not() { return query; }, order() { return query; },
    range(start: number, end: number) { ranges.push([start, end]); return query; },
    abortSignal() { return Promise.resolve(pages.shift()!); },
  };
  return { client: { from: () => query } as unknown as SupabaseClient, ranges };
}

test("hub loader reads beyond the first API page", async () => {
  const { client, ranges } = fixture([{ data: Array(1000).fill({ user_id: "friend" }), error: null }, { data: [{ user_id: "friend" }], error: null }]);
  assert.equal((await loadHubRatings(client, ["friend"])).length, 1001);
  assert.deepEqual(ranges, [[0, 999], [1000, 1999]]);
});

test("hub loader surfaces errors instead of returning partial insights", async () => {
  const error = new Error("unavailable");
  const { client } = fixture([{ data: Array(1000).fill({}), error: null }, { data: null, error }]);
  await assert.rejects(loadHubRatings(client, ["friend"]), error);
});

test("hub loader skips queries when there are no friends", async () => {
  const { client, ranges } = fixture([]);
  assert.deepEqual(await loadHubRatings(client, []), []);
  assert.deepEqual(ranges, []);
});
