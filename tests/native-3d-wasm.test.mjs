import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {initializeNative3d,nativeDiagnostics,traceNativeSegments3d,integrateNativeGravityBatch,findEnginePath} from '../js/core/native-3d.js';
import {segmentBox3d,raycastScene3d} from '../js/core/collision-3d.js';
import {hasLineOfSight} from '../js/core/ai-perception.js';

const mesh=(id,x,y,extra={})=>({id,type:'mesh3d',x,y,w:32,h:64,depth3d:32,elevation3d:0,...extra});
const actor=mesh(1,0,0,{playable3d:true}),enemy=mesh(2,0,300,{ai:{enabled:true}}),wall=mesh(3,-40,150,{w:120,depth3d:1,h:100});
const origin=[.25,.6,0],direction=[0,0,1],scene=[actor,enemy,wall];
const snapshot=()=>({hit:raycastScene3d(origin,direction,scene,{exclude:actor})?.entity.id,visible:hasLineOfSight(actor,enemy,scene)});
const fallback=snapshot();
await initializeNative3d({wasmBinary:await readFile(new URL('../native/dist/warlike_pathfinding.wasm',import.meta.url))});
const ready=nativeDiagnostics().state==='ready',queries=nativeDiagnostics().capabilities.raycasts3d;
if(process.env.WARLIKE_REQUIRE_NATIVE_QUERIES==='1')assert.ok(ready&&queries,'Compile the C++ query module before this required check.');
const available={skip:queries?false:'The checked-in WASM predates native segment queries; the native build job requires and tests the compiled module.'};

test('deployed WebAssembly runs native navigation and gravity batches with reusable memory',()=>{
 assert.ok(ready,'Bundled C++ module must instantiate');
 assert.equal(findEnginePath({x:0,y:0},{x:180,y:0},[],{cellSize:24}).at(-1).x,180);
 for(const count of [0,1,100,1000]){
  const bodies=Array.from({length:count},(_,i)=>({y:2+i*.01,vy:-1,gravity:15,restitution:0}));
  const result=integrateNativeGravityBatch(bodies,1/120);assert.equal(result.length,count);
  for(let i=0;i<count;i++){assert.ok(Math.abs(result[i].vy-(-1-15/120))<1e-5);assert.ok(Math.abs(result[i].y-(bodies[i].y+(-1-15/120)/120))<1e-5);}
 }
 const before=nativeDiagnostics().scratchBytes;
 integrateNativeGravityBatch([{y:1,vy:0,gravity:10,restitution:0}],1/60);
 assert.equal(nativeDiagnostics().scratchBytes,before);
 assert.ok(nativeDiagnostics().calls.paths>0&&nativeDiagnostics().calls.gravityBatches>=4);
 assert.equal(integrateNativeGravityBatch([{y:1e100,vy:0,gravity:10,restitution:0}],1/60),null);
});

test('native segment batches match the JavaScript geometry over seeded scenes',available,()=>{
 let seed=319;const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);
 const point=()=>({x:Math.fround(random()*800-400),y:Math.fround(random()*800-400),z:Math.fround(random()*300)});
 const boxes=Array.from({length:128},()=>({...point(),w:Math.fround(1+random()*80),d:Math.fround(1+random()*80),h:Math.fround(1+random()*100)}));
 const segments=Array.from({length:256},()=>({from:point(),to:point()}));
 const results=traceNativeSegments3d(segments,boxes);assert.equal(results.length,segments.length);
 for(let i=0;i<segments.length;i++){
  let index=-1,fraction=Infinity;
  boxes.forEach((box,j)=>{const t=segmentBox3d(segments[i].from,segments[i].to,box);if(t!==null&&t<fraction){index=j;fraction=t;}});
  assert.equal(results[i].index,index,`ray ${i}`);
  if(index>=0)assert.ok(Math.abs(results[i].fraction-fraction)<1e-5,`distance of ray ${i}`);
 }
 const bytes=nativeDiagnostics().scratchBytes;
 traceNativeSegments3d(segments,boxes);assert.equal(nativeDiagnostics().scratchBytes,bytes);
});

test('native queries preserve border contacts, ties, negative directions and misses',available,()=>{
 const boxes=[{x:5,y:0,z:0,w:1,d:1,h:1},{x:5,y:0,z:0,w:1,d:1,h:1}];
 const rays=[{from:{x:0,y:0,z:0},to:{x:10,y:0,z:0}},{from:{x:6,y:.5,z:.5},to:{x:6,y:.5,z:.5}},{from:{x:10,y:.5,z:.5},to:{x:0,y:.5,z:.5}},{from:{x:0,y:2,z:0},to:{x:10,y:2,z:0}}];
 const hits=traceNativeSegments3d(rays,boxes);
 assert.deepEqual(hits.map(hit=>hit.index),[0,0,0,-1]);
 assert.equal(hits[0].fraction,.5);assert.equal(hits[1].fraction,0);assert.ok(Math.abs(hits[2].fraction-.4)<1e-6);
 assert.deepEqual(traceNativeSegments3d(rays,[]).map(hit=>hit.index),[-1,-1,-1,-1]);
 assert.deepEqual(traceNativeSegments3d([],boxes),[]);
});

test('C++ is used by aimed fire and AI visibility with the same scene filtering',available,()=>{
 const calls=nativeDiagnostics().calls.rayBatches;
 assert.deepEqual(snapshot(),fallback);assert.equal(fallback.hit,3);assert.equal(fallback.visible,false);
 wall.sequenceEnabled=false;
 try{assert.equal(snapshot().hit,2);assert.equal(snapshot().visible,true);}finally{delete wall.sequenceEnabled;}
 wall.h=1;
 try{assert.equal(hasLineOfSight(actor,enemy,scene),true);}finally{wall.h=100;}
 assert.ok(nativeDiagnostics().calls.rayBatches>=calls+4,'actual gameplay paths must call C++');
 assert.equal(raycastScene3d([NaN,0,0],direction,scene),null);
 assert.equal(raycastScene3d(origin,direction,scene,{maxDistance:-1}),null);
});

test('invalid native query input returns the JS fallback signal without corrupting later requests',available,()=>{
 const from={x:0,y:0,z:0},to={x:10,y:0,z:0},box={x:5,y:-1,z:-1,w:1,d:2,h:2};
 assert.equal(traceNativeSegments3d([{from:{x:NaN,y:0,z:0},to}],[box]),null);
 assert.equal(traceNativeSegments3d([{from,to}],[{...box,w:-1}]),null);
 assert.equal(traceNativeSegments3d(Array(4097).fill({from,to}),[box]),null);
 assert.equal(traceNativeSegments3d([{from:{x:-3e38,y:0,z:0},to:{x:3e38,y:0,z:0}}],[box]),null);
 assert.equal(traceNativeSegments3d([{from,to}],[box])[0].index,0);
});
