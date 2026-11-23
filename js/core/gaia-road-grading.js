// WB 1.4 — deterministic road earthworks on the existing Gaia heightfield.
// Preview and apply are separate; no terrain is modified until the author commits.
import {heightfieldAt3d,validTerrainHeightfield} from './gaia-terrain-physics.js';
import {validRoadSpline,sampleRoadSpline} from './gaia-road-spline.js';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const smoothstep=t=>{t=clamp(t,0,1);return t*t*(3-2*t)};
const finite=v=>typeof v==='number'&&Number.isFinite(v);
const terrainHeight=(entities,x,z)=>{
 let y=null;
 for(const o of entities){
  const tile=o?.terrainHeightfield;
  if(o?.enabled===false||!validTerrainHeightfield(tile))continue;
  const value=heightfieldAt3d(tile,x,z);
  if(value!==null)y=y===null?value:Math.max(y,value);
 }
 return y;
};
const nearestSegment=(x,z,samples)=>{
 let nearest=null;
 for(let i=1;i<samples.length;i++){
  const a=samples[i-1],b=samples[i],dx=b.x-a.x,dz=b.z-a.z,span=dx*dx+dz*dz;
  if(span<1e-10)continue;
  const t=clamp(((x-a.x)*dx+(z-a.z)*dz)/span,0,1);
  const distance=Math.hypot(x-(a.x+dx*t),z-(a.z+dz*t));
  if(!nearest||distance<nearest.distance)nearest={distance,i,t};
 }
 return nearest;
};
/**
 * Preview the terrain sample changes under an authored road and soft shoulders.
 * Target grade interpolates Gaia's ORIGINAL centreline heights, so cuts/fills
 * do not accumulate as we iterate the mutable grid. World units: metres.
 * Returns only changed indexed values; commit through applyRoadGradePlan().
 */
export function previewRoadGrade(road,entities,{shoulderWidth=2,segmentsPerSpan=12}={}){
 if(!validRoadSpline(road)||!Array.isArray(entities))throw Error('Road grade requires a valid road and Gaia tiles');
 if(!finite(shoulderWidth)||shoulderWidth<0||shoulderWidth>32)throw Error('Invalid shoulder width');
 const tiles=entities.filter(e=>e?.enabled!==false&&validTerrainHeightfield(e?.terrainHeightfield));
 if(!tiles.length)throw Error('No Gaia terrain for road grade');
 const samples=sampleRoadSpline(road,{segmentsPerSpan});
 const grade=samples.map(p=>{
  const y=terrainHeight(tiles,p.x,p.z);
  if(y===null)throw Error('Road grade crosses outside Gaia terrain coverage');
  return y;
 });
 const halfWidth=road.width/2,limit=halfWidth+shoulderWidth;
 const patches=[];
 for(const entity of tiles){
  const tile=entity.terrainHeightfield,n=tile.resolution,spacing=tile.size/(n-1);
  const changes=[];
  for(let iz=0;iz<n;iz++)for(let ix=0;ix<n;ix++){
   const x=tile.offsetX-tile.size/2+ix*spacing,z=tile.offsetZ-tile.size/2+iz*spacing;
   const hit=nearestSegment(x,z,samples);
   if(!hit||hit.distance>limit)continue;
   const start=grade[hit.i-1],end=grade[hit.i],target=start+(end-start)*hit.t;
   const weight=hit.distance<=halfWidth?1:shoulderWidth>0?1-smoothstep((hit.distance-halfWidth)/shoulderWidth):0;
   const index=iz*n+ix,before=tile.heights[index],after=clamp((before*tile.height*(1-weight)+target*weight)/tile.height,0,1);
   if(Math.abs(after-before)>1e-9)changes.push({index,before,after});
  }
  if(changes.length)patches.push({terrainId:entity.id,resolution:n,size:tile.size,height:tile.height,offsetX:tile.offsetX,offsetZ:tile.offsetZ,changes});
 }
 return {roadSchema:road.schema,shoulderWidth,patches,changedSamples:patches.reduce((n,p)=>n+p.changes.length,0)};
}
/** All-or-nothing application; stale previews are rejected without partial writes. */
export function applyRoadGradePlan(plan,entities,{reverse=false}={}){
 if(!plan||!Array.isArray(plan.patches)||!Array.isArray(entities))throw Error('Invalid road grade plan');
 const tasks=[];
 for(const patch of plan.patches){
  const entity=entities.find(e=>e.id===patch.terrainId);
  const t=entity?.terrainHeightfield;
  if(!validTerrainHeightfield(t)||t.resolution!==patch.resolution||t.size!==patch.size||t.height!==patch.height||t.offsetX!==patch.offsetX||t.offsetZ!==patch.offsetZ)throw Error('Gaia tile changed since road grade preview');
  const source=reverse?'after':'before',dest=reverse?'before':'after';
  for(const change of patch.changes){
   if(!Number.isInteger(change.index)||change.index<0||change.index>=t.heights.length||!finite(change[source])||!finite(change[dest])||Math.abs(t.heights[change.index]-change[source])>1e-8)
    throw Error('Stale Gaia road grade sample');
  }
  tasks.push({entity,t,changes:patch.changes});
 }
 let count=0;
 for(const {entity,t,changes} of tasks){
  for(const change of changes){t.heights[change.index]=reverse?change.before:change.after;count++}
  if(changes.length)entity.terrainRevision3d=(Number(entity.terrainRevision3d)||0)+1;
 }
 return count;
}
