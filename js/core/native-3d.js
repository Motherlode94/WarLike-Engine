// Optional C++17/WASM accelerator for WarLike 3D pathfinding.
// The browser needs a precompiled native/dist bundle: never compile user C++ in-browser.
import {findPath as jsPath} from './pathfinding.js';
let native=null;
let loadState='idle',loadPromise=null;
export const nativeStatus=()=>loadState;
export function initializeNative3d(){
 if(loadPromise)return loadPromise;
 loadPromise=(async()=>{
 loadState='loading';
 try {
  const module=await import('../../native/dist/warlike_pathfinding.mjs');
  const create=module.default;
  native=await create({locateFile:name=>new URL('../../native/dist/'+name,import.meta.url).href});
  if(typeof native._wl_find_path!=='function'||typeof native._wl_integrate_gravity!=='function'||typeof native._wl_overlap_aabb3d!=='function'||typeof native._malloc!=='function'||typeof native._free!=='function'||!native.HEAPF32)throw Error('Incomplete native module');
  loadState='ready';
 }catch(error){native=null;loadState='fallback';console.info('[WarLike Native] JS navigation fallback:',error?.message||error)}
})();return loadPromise;
}
export function findEnginePath(start,goal,obstacles=[],options={}){
 if(!native)return jsPath(start,goal,obstacles,options);
 let rectPtr=0,outPtr=0;
 try {
  const valid=obstacles.filter(o=>[o.x,o.y,o.w,o.h].every(Number.isFinite));
  const capacity=8192;
  rectPtr=native._malloc(Math.max(4,valid.length*16));
  outPtr=native._malloc(capacity*4);
  if(!rectPtr||!outPtr)throw Error('Out of memory');
  const buffer=new Float32Array(valid.flatMap(o=>[o.x,o.y,o.w,o.h]));
  native.HEAPF32.set(buffer,rectPtr>>>2);
  const size=native._wl_find_path(start.x,start.y,goal.x,goal.y,rectPtr,valid.length,options.cellSize||48,options.padding||0,options.maxNodes||1200,outPtr,capacity);
  if(size<0)throw Error('Native path buffer exceeded');
  if(size===0)return [];
  const points=[];const base=outPtr>>>2;
  for(let i=0;i<size;i++)points.push({x:native.HEAPF32[base+2*i],y:native.HEAPF32[base+2*i+1]});
  return points;
 }catch(err){console.warn('[WarLike Native] Pathfinding JS fallback:',err);return jsPath(start,goal,obstacles,options)}
 finally{if(rectPtr)native._free(rectPtr);if(outPtr)native._free(outPtr)}
}

export function integrateNativeGravity(y,vy,gravity,restitution,dt){
 if(!native||typeof native._wl_integrate_gravity!=='function')return null;
 const ptr=native._malloc(8);if(!ptr)return null;
 try {
  native.HEAPF32[ptr>>>2]=y;native.HEAPF32[(ptr>>>2)+1]=vy;
  native._wl_integrate_gravity(ptr,gravity,restitution,dt);
  return {y:native.HEAPF32[ptr>>>2],vy:native.HEAPF32[(ptr>>>2)+1]};
 } finally {native._free(ptr)}
}

export function overlapNative3d(a,b){
 if(!native||typeof native._wl_overlap_aabb3d!=='function')return null;
 const ptr=native._malloc(48);if(!ptr)return null;
 try{
  native.HEAPF32.set([a.x,a.z,a.y,a.w,a.d,a.h,b.x,b.z,b.y,b.w,b.d,b.h],ptr>>>2);
  return native._wl_overlap_aabb3d(ptr,ptr+24)===1;
 }finally{native._free(ptr)}
}

/** Batch up to 100k bodies in a single C++/WASM call. Returns null if WASM unavailable. */
export function integrateNativeGravityBatch(bodies,dt){
 if(!native||typeof native._wl_integrate_gravity_batch!=='function')return null;
 if(!Array.isArray(bodies)||bodies.length>100000)return null;
 if(!bodies.length)return [];
 const ptr=native._malloc(bodies.length*16);if(!ptr)return null;
 try{
  const floats=new Float32Array(bodies.length*4);
  for(let i=0;i<bodies.length;i++){
   const b=bodies[i];if(![b.y,b.vy,b.gravity,b.restitution].every(Number.isFinite))return null;
   floats.set([b.y,b.vy,b.gravity,b.restitution],i*4);
  }
  native.HEAPF32.set(floats,ptr>>>2);
  const result=native._wl_integrate_gravity_batch(ptr,bodies.length,dt);
  if(result!==bodies.length)return null;
  const base=ptr>>>2;
  return bodies.map((_,i)=>({y:native.HEAPF32[base+4*i],vy:native.HEAPF32[base+4*i+1]}));
 }finally{native._free(ptr)}
}
