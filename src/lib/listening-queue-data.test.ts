import assert from "node:assert/strict";
import test from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import { loadListeningQueue } from "./listening-queue-data";

function fixture(pages: { data: unknown[] | null; error: unknown }[]) {
  const ranges: number[][] = [];
  const filters: string[][] = [];
  const query = {
    select() { return query; }, order() { return query; },
    eq(key: string, value: string) { filters.push([key,value]); return query; },
    range(start: number, end: number) { ranges.push([start,end]); return query; },
    abortSignal() { return Promise.resolve(pages.shift()!); },
  };
  return { client: { from: () => query } as unknown as SupabaseClient, ranges, filters };
}
test("queue loader paginates and scopes every page to its owner", async () => {
  const { client,ranges,filters } = fixture([{ data:Array(1000).fill({status:"want"}),error:null },{ data:[{status:"listening"}],error:null }]);
  assert.equal((await loadListeningQueue(client,"owner")).length,1001);
  assert.deepEqual(ranges,[[0,999],[1000,1999]]);
  assert.deepEqual(filters,[["user_id","owner"],["user_id","owner"]]);
});
test("queue loader surfaces errors without a misleading partial queue", async () => {
  const error = new Error("unavailable");
  const {client} = fixture([{data:Array(1000).fill({}),error:null},{data:null,error}]);
  await assert.rejects(loadListeningQueue(client,"owner"),error);
});
test("queue loader handles an empty queue", async () => {
  const {client} = fixture([{data:[],error:null}]);
  assert.deepEqual(await loadListeningQueue(client,"owner"),[]);
});
