// Optional C++17/WASM accelerator for WarLike 3D pathfinding.
// The browser needs a precompiled native/dist bundle: never compile user C++ in-browser.
import {findPath as jsPath} from './pathfinding.js';
let native=null;
let loadState='idle';
export const nativeStatus=()=>loadState;
export async function initializeNative3d(){
 if(loadState==='loading'||loadState==='ready')return;
 loadState='loading';
 try {
  const module=await import('../../native/dist/warlike_pathfinding.mjs');
  const create=module.default;
  native=await create({locateFile:name=>new URL('../../native/dist/'+name,import.meta.url).href});
  if(typeof native._wl_find_path!=='function'||typeof native._malloc!=='function'||!native.HEAPF32)throw Error('Incomplete native module');
  loadState='ready';
 }catch(error){native=null;loadState='fallback';console.info('[WarLike Native] JS navigation fallback:',error?.message||error)}
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
