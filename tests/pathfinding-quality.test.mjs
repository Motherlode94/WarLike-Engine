import test from 'node:test';
import assert from 'node:assert/strict';
import {findPath,smoothPath,smoothingPadding} from '../js/core/pathfinding.js';
import {makeScene,freePoint} from '../scripts/bench-pathfinding.mjs';

const PADDING=8,CELL=32,options={cellSize:CELL,padding:PADDING,maxNodes:12000};
const length=(start,path)=>path.reduce((sum,p,i)=>sum+Math.hypot(p.x-(i?path[i-1].x:start.x),p.y-(i?path[i-1].y:start.y)),0);
// Independent check (dense sampling, not the production slab test): no point strictly inside an inflated obstacle.
function violations(start,path,obstacles,padding){
 let bad=0,prev=start;
 for(const p of path){
  const steps=Math.max(1,Math.ceil(Math.hypot(p.x-prev.x,p.y-prev.y)));
  for(let i=0;i<=steps;i++){
   const x=prev.x+(p.x-prev.x)*i/steps,y=prev.y+(p.y-prev.y)*i/steps;
   if(obstacles.some(o=>x>o.x-padding+.01&&x<o.x+o.w+padding-.01&&y>o.y-padding+.01&&y<o.y+o.h+padding-.01))bad++;
  }
  prev=p;
 }
 return bad;
}
const scenes=()=>[[3,25],[4,70],[5,120]].map(([seed,count])=>makeScene(seed,count));

test('smoothed routes never cross an inflated obstacle',()=>{
 let checked=0;
 for(const {rnd,obstacles} of scenes())for(let i=0;i<40;i++){
  const a=freePoint(rnd,obstacles),b=freePoint(rnd,obstacles),path=findPath(a,b,obstacles,options);
  if(!path.length)continue;checked++;
  assert.equal(violations(a,path,obstacles,PADDING),0);
  assert.deepEqual(path.at(-1),{x:b.x,y:b.y});
 }
 assert.ok(checked>60,'assez de chemins vérifiés : '+checked);
});
test('smoothing never lengthens a route and strongly reduces waypoints',()=>{
 let raw=0,smooth=0,n=0;
 for(const {rnd,obstacles} of scenes())for(let i=0;i<40;i++){
  const a=freePoint(rnd,obstacles),b=freePoint(rnd,obstacles);
  const r=findPath(a,b,obstacles,{...options,smooth:false}),s=findPath(a,b,obstacles,options);
  assert.equal(s.length>0,r.length>0,'le lissage ne change pas l’accessibilité');
  if(!r.length)continue;
  assert.ok(length(a,s)<=length(a,r)+1e-6);assert.ok(s.length<=r.length);
  raw+=r.length;smooth+=s.length;n++;
 }
 assert.ok(n>60&&smooth<raw/3,`points bruts ${raw} → lissés ${smooth}`);
});
test('routes are deterministic',()=>{
 const {rnd,obstacles}=makeScene(9,60),a=freePoint(rnd,obstacles),b=freePoint(rnd,obstacles);
 assert.deepEqual(findPath(a,b,obstacles,options),findPath(a,b,obstacles,options));
});
test('smoothPath: open field collapses to the goal, a wall keeps the corner it needs',()=>{
 const start={x:0,y:0},goal={x:300,y:0};
 assert.deepEqual(smoothPath(start,[{x:48,y:0},{x:112,y:0},{x:176,y:0},{x:240,y:0},goal],[]),[goal]);
 const wall=[{x:140,y:-200,w:20,h:260}];// the straight line to the goal is blocked, the detour below is not
 const out=smoothPath(start,[{x:50,y:0},{x:100,y:90},{x:200,y:90},goal],wall);
 assert.deepEqual(out,[{x:200,y:90},goal]);
 assert.equal(violations(start,out,wall,0),0);
});
test('smoothPath is safe on odd input and does not mutate it',()=>{
 const start={x:5,y:5},path=[{x:10,y:5},{x:60,y:5}],frozen=structuredClone(path);
 assert.deepEqual(smoothPath(start,[],[]),[]);
 assert.deepEqual(smoothPath(start,[{x:1,y:2}],[]),[{x:1,y:2}]);
 assert.deepEqual(smoothPath(start,path,[null,{x:NaN,y:0,w:1,h:1},{x:0,y:0,w:-3,h:4}]),[{x:60,y:5}]);
 assert.deepEqual(path,frozen);
 const inside=[{x:0,y:0,w:30,h:30}];// start inside an obstacle: keeps every waypoint, never throws
 assert.equal(smoothPath(start,[{x:20,y:5},{x:80,y:5},{x:140,y:5}],inside).length>=1,true);
});
test('smoothingPadding adds a quarter cell and clamps the cell like findPath',()=>{
 assert.equal(smoothingPadding({cellSize:64,padding:4}),20);
 assert.equal(smoothingPadding({cellSize:1000}),32);
 assert.equal(smoothingPadding({}),12);
});
