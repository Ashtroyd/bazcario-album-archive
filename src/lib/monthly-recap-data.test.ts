import test from "node:test";
import assert from "node:assert/strict";
import type {SupabaseClient} from "@supabase/supabase-js";
import {loadMonthlyRecap} from "./monthly-recap-data";

function fixture(failTable?:string){
  const calls:{table:string;filters:unknown[][];start:number}[]=[];
  const client={from(table:string){
    const filters:unknown[][]=[];let start=0;
    const q={select(){return q;},eq(k:string,v:unknown){filters.push([k,v]);return q;},gte(k:string,v:unknown){filters.push([k,v]);return q;},lt(k:string,v:unknown){filters.push([k,v]);return q;},in(k:string,v:unknown){filters.push([k,v]);return q;},or(){return q;},not(){return q;},order(){return q;},range(n:number){start=n;return q;},abortSignal(){
      calls.push({table,filters,start});
      const row={user_id:"owner",album_id:"album",overall_rating:8,updated_at:"2026-09-12T12:00:00Z",album:{id:"album",title:"Blue",artist:"Joni Mitchell",cover_image_url:null},favorite_track:null};
      return Promise.resolve({data:table==="ratings"?start===0?Array.from({length:1000},(_,i)=>({...row,album_id:String(i),album:{...row.album,id:String(i)}})):[{...row,album_id:"last"}]:[],error:table===failTable?new Error("unavailable"):null});
    }};return q;
  }} as unknown as SupabaseClient;
  return {client,calls};
}
test("recap loader paginates owner updates with UTC bounds and excludes notes from queries",async()=>{
  const {client,calls}=fixture();const {recap}=await loadMonthlyRecap(client,"owner","2026-09");
  assert.equal(recap.albums.length,1001);
  const pages=calls.filter(c=>c.table==="ratings");assert.deepEqual(pages.map(c=>c.start),[0,1000]);
  for(const page of pages){assert.ok(page.filters.some(f=>f[0]==="user_id"&&f[1]==="owner"));assert.ok(page.filters.some(f=>f[0]==="updated_at"&&f[1]==="2026-09-01T00:00:00.000Z"));}
  assert.ok(calls.find(c=>c.table==="monthly_favorites")?.filters.some(f=>f[0]==="month"&&f[1]==="2026-09-01"));
});
test("recap loader surfaces owner load failures instead of returning a partial month",async()=>{
  const {client}=fixture("ratings");await assert.rejects(loadMonthlyRecap(client,"owner","2026-09"),/unavailable/);
});
test("friend lookup failures preserve the owner recap with explicit unavailable insights",async()=>{
  const {client}=fixture("friendships");const result=await loadMonthlyRecap(client,"owner","2026-09");
  assert.equal(result.recap.albums.length,1001);assert.equal(result.insightsUnavailable,true);assert.deepEqual(result.recap.disagreements,[]);
});
