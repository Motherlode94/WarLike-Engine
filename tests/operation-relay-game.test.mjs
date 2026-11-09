import test from "node:test";
import assert from "node:assert/strict";
import {CONFIG,initialMission,startMission,countRelays,activateRelay,tryExtract,damagePlayer} from "../examples/operation-relay-3d/game-rules.js";

test("Mission starts locked, with health and 3 inactive relays",()=>{
 const mission=startMission();
 assert.equal(mission.phase,"playing");
 assert.equal(mission.health,CONFIG.playerMaxHealth);
 assert.equal(countRelays(mission),0);
 assert.equal(tryExtract(mission),false);
 assert.equal(mission.phase,"playing");
});
test("Relay activation is idempotent and rejects invalid indices",()=>{
 const m=startMission();
 assert.equal(activateRelay(m,1),true);
 assert.equal(activateRelay(m,1),false);
 assert.equal(activateRelay(m,999),false);
 assert.equal(activateRelay(m,-1),false);
 assert.equal(countRelays(m),1);
});
test("Mission victory requires all relays",()=>{
 const m=startMission();
 for(let i=0;i<3;i++)assert.equal(activateRelay(m,i),true);
 assert.equal(countRelays(m),3);
 assert.equal(tryExtract(m),true);
 assert.equal(m.phase,"won");
 assert.equal(activateRelay(m,0),false);
});
test("Damage can fail mission and prevents post-mortem victory",()=>{
 const m=startMission();
 damagePlayer(m,40);
 assert.equal(m.health,60);
 damagePlayer(m,80);
 assert.equal(m.health,0);
 assert.equal(m.phase,"lost");
 assert.equal(tryExtract(m),false);
});
test("Initial state returns independent arrays",()=>{
 const a=initialMission(),b=initialMission();
 a.relays[0]=true;assert.equal(b.relays[0],false);
});
