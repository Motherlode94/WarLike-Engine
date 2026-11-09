import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {makeWorld,found,paint,tick,worldStats,random,verifyWorld,WIDTH,HEIGHT,TERRAIN,FACTIONS} from "../examples/worldforge/world.js";

test("Worldforge produces reproducible terrain with varied land and sea",()=>{
 const a=makeWorld(12345),b=makeWorld(12345),other=makeWorld(12346);
 assert.equal(a.width,WIDTH);assert.equal(a.height,HEIGHT);assert.deepEqual(a.tiles,b.tiles);
 assert.notDeepEqual(a.tiles,other.tiles);
 assert.ok(a.tiles.includes(TERRAIN.GRASS)||a.tiles.includes(TERRAIN.FOREST));
 assert.ok(a.tiles.includes(TERRAIN.WATER)||a.tiles.includes(TERRAIN.DEEP));
 assert.equal(a.fire.length,WIDTH*HEIGHT);
});
test("placing a civilization requires land and spacing",()=>{
 const w=makeWorld(3718),index=w.tiles.findIndex(v=>[TERRAIN.SAND,TERRAIN.GRASS,TERRAIN.FOREST].includes(v));
 assert.ok(index>=0);
 const x=index%w.width,y=Math.floor(index/w.width);
 const first=found(w,x,y,0);assert.equal(first.ok,true);
 assert.equal(found(w,x,y,1).ok,false);
 assert.equal(w.settlements[0].faction,0);assert.equal(w.settlements.length,1);
 assert.equal(found(w,-1,y,2).ok,false);
});
test("civilizations eat, reproduce, build and evolve without generating negative resources",()=>{
 const w=makeWorld(22991);
 let foundOne=false;
 for(let y=3;y<w.height-3&&!foundOne;y++)for(let x=3;x<w.width-3&&!foundOne;x++){
  if(found(w,x,y,0).ok)foundOne=true;
 }
 assert.equal(foundOne,true);
 const rand=random(991);
 for(let i=0;i<180;i++){
  tick(w,rand);
  for(const s of w.settlements){
   for(const k of ["pop","food","wood","stone","houses","level","territory"])
    assert.ok(Number.isFinite(s[k])&&s[k]>=0,k+" year "+i);
  }
 }
 assert.equal(w.year,180);
 assert.ok(w.stats.births>=0);
 assert.ok(w.stats.deaths>=0);
 assert.equal(worldStats(w).population,w.settlements.reduce((n,s)=>n+s.pop,0));
});
test("terrain tools affect the world and meteors damage only nearby cells",()=>{
 const w=makeWorld(42),x=10,y=10;
 assert.equal(paint(w,x,y,"grass").ok,true);
 assert.equal(w.tiles[y*w.width+x],TERRAIN.GRASS);
 assert.equal(paint(w,x,y,"fire").ok,true);
 assert.equal(w.fire[y*w.width+x],6);
 assert.equal(paint(w,x,y,"rain").ok,true);
 assert.equal(w.fire[y*w.width+x],0);
 assert.equal(paint(w,x,y,"meteor").ok,true);
 assert.equal(w.stats.disasters,1);
 assert.equal(paint(w,999,999,"grass").ok,false);
});
test("JSON saved worlds round-trip and corrupt data is rejected",()=>{
 const w=makeWorld(4);
 const restored=verifyWorld(JSON.parse(JSON.stringify(w)));
 assert.deepEqual(restored,w);
 assert.throws(()=>verifyWorld({...w,tiles:[0]}));
 assert.throws(()=>verifyWorld({...w,fire:[-1,...w.fire.slice(1)]}));
 assert.throws(()=>verifyWorld({...w,width:200,height:300}));
});
test("Worldforge is reachable through the Engine demo browser",()=>{
 const browser=readFileSync(new URL("../js/ui/demo-browser.js",import.meta.url),"utf8");
 const html=readFileSync(new URL("../examples/worldforge/index.html",import.meta.url),"utf8");
 const client=readFileSync(new URL("../examples/worldforge/game.js",import.meta.url),"utf8");
 assert.match(browser,/id:'worldforge'/);
 assert.match(browser,/externalUrl:'examples\/worldforge\/index.html'/);
 assert.match(browser,/iframe\.src=new URL/);
 for(const id of ["world","civilization","speed","newWorld","saveWorld","loadWorld","playPause","eventLog"]){
  assert.match(html,new RegExp('id="'+id+'"'));
 }
 assert.match(client,/requestAnimationFrame\(loop\)/);
 assert.equal(FACTIONS.length,4);
});
