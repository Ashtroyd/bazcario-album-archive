import test from "node:test";
import assert from "node:assert/strict";
import {buildMonthlyRecap,type RecapRating} from "./monthly-recap";
import {recapBounds,validRecapMonth} from "./recap-month";
const album={id:"album",title:"Blue",artist:"Joni Mitchell",cover_image_url:null};
const row=(patch:Partial<RecapRating>={}):RecapRating=>({user_id:"me",album_id:"album",overall_rating:8,updated_at:"2026-09-12T12:00:00Z",album,favorite_track:{id:"track",name:"River"},...patch});
test("album recap counts only the owner's latest visible scored updates in the month",()=>{
 const result=buildMonthlyRecap("me","2026-09",[row(),row(),row({user_id:"other"}),row({album_id:"missing",album:null}),row({album_id:"notes",overall_rating:null}),row({album_id:"old",updated_at:"2026-08-31T23:59:59Z"}),row({album_id:"future",updated_at:"2026-10-01T00:00:00Z"})],[],[],[]);
 assert.equal(result.albums.length,1);assert.equal(result.average,8);assert.equal(result.tracks[0].title,"River");
});
test("zero is a score while null, invalid and empty values are not",()=>{
 const result=buildMonthlyRecap("me","2026-09",[row({overall_rating:0}),row({album_id:"invalid",overall_rating:"invalid"}),row({album_id:"empty",overall_rating:""})],[],[],[]);
 assert.equal(result.albums.length,1);assert.equal(result.average,0);
});
test("only accepted, visible friend scores contribute to real disagreements",()=>{
 const people=[{id:"friend",name:"Alex",avatar:null}];
 const result=buildMonthlyRecap("me","2026-09",[row()],[],people,[row({user_id:"friend",overall_rating:3}),row({user_id:"stranger",overall_rating:0}),row({user_id:"private",overall_rating:0})]);
 assert.equal(result.disagreements.length,1);assert.equal(result.disagreements[0].gap,5);
 assert.equal(buildMonthlyRecap("me","2026-09",[row()],[],people,[]).disagreements.length,0);
});
test("monthly picks preserve their order and empty months invent nothing",()=>{
 const picks=[{id:"b",title:"B",artist:"B",position:2},{id:"a",title:"A",artist:"A",position:1}];
 const result=buildMonthlyRecap("me","2026-09",[],picks,[],[]);
 assert.deepEqual(result.picks.map(p=>p.id),["a","b"]);assert.equal(result.average,null);assert.deepEqual(result.tracks,[]);assert.deepEqual(result.disagreements,[]);
});
test("month boundaries and validation are timezone independent",()=>{
 assert.equal(recapBounds("2026-12").end,"2027-01-01T00:00:00.000Z");
 assert.equal(validRecapMonth("2026-11",new Date("2026-10-08T00:00:00Z")),"2026-10");
});
