// Reproducible CPU measurements, not a browser frame-rate benchmark.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {initializeNative3d,nativeDiagnostics,traceNativeSegments3d} from '../js/core/native-3d.js';
import {segmentBox3d} from '../js/core/collision-3d.js';
await initializeNative3d({wasmBinary:await readFile(new URL('../native/dist/warlike_pathfinding.wasm',import.meta.url))});
assert.ok(nativeDiagnostics().capabilities.raycasts3d,'Rebuild native/dist with native/build-wasm.sh first.');
let seed=41;const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);
const point=()=>({x:Math.floor(random()*1600-800),y:Math.floor(random()*1600-800),z:Math.floor(random()*200)});
const reference=(segments,boxes)=>segments.map(({from,to})=>{
 let index=-1,fraction=Infinity;
 for(let i=0;i<boxes.length;i++){const t=segmentBox3d(from,to,boxes[i]);if(t!==null&&t<fraction){index=i;fraction=t;}}
 return index;
});
console.log('obstacles | segments | JS ms/lot | C++ WASM ms/lot');
for(const [boxCount,rayCount] of [[16,1],[128,16],[512,128]]){
 const boxes=Array.from({length:boxCount},()=>({...point(),w:12+Math.floor(random()*80),d:12+Math.floor(random()*80),h:12+Math.floor(random()*150)}));
 const rays=Array.from({length:rayCount},()=>({from:point(),to:point()}));
 assert.deepEqual(traceNativeSegments3d(rays,boxes).map(hit=>hit.index),reference(rays,boxes));
 const times=[];
 for(const run of [()=>reference(rays,boxes),()=>traceNativeSegments3d(rays,boxes)]){
  for(let i=0;i<8;i++)run();
  const started=performance.now();for(let i=0;i<30;i++)run();times.push((performance.now()-started)/30);
 }
 console.log(`${boxCount} | ${rayCount} | ${times[0].toFixed(3)} | ${times[1].toFixed(3)}`);
}
console.log(JSON.stringify(nativeDiagnostics()));
