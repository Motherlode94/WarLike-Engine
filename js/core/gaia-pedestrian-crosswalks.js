// WB 2.8b — pedestrian crossing safety from authored Gaia roads and junctions.
// All coordinates in metres (XZ); no independent road or crossing database.
import {sampleRoadSpline,validRoadSpline} from './gaia-road-spline.js';
import {validRoadJunction} from './gaia-road-junctions.js';
const dot=(a,b)=>a.x*b.x+a.z*b.z;
const sub=(a,b)=>({x:a.x-b.x,z:a.z-b.z});
const len=v=>Math.hypot(v.x,v.z);
const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
function approachPoint(samples,center,metres){
 let best=null,smallest=Infinity;
 for(let i=1;i<samples.length;i++){
  const a=samples[i-1],b=samples[i],ab=sub(b,a),size=len(ab);
  if(size<1e-6)continue;
  const t=clamp(dot(sub(center,a),ab)/(size*size),0,1);
  const p={x:a.x+t*ab.x,z:a.z+t*ab.z},d=len(sub(center,p));
  if(d<smallest){smallest=d;best={point:p,tangent:{x:ab.x/size,z:ab.z/size}}}
 }
 if(!best)return [];
 return [-1,1].map(direction=>{
  const point={x:best.point.x+direction*best.tangent.x*metres,z:best.point.z+direction*best.tangent.z*metres};
  const normal={x:-best.tangent.z,z:best.tangent.x};
  return {point,tangent:best.tangent,normal,direction};
 });
}
/** Reconstruct zebra crossing footprints from the original native carrefours. */
export function buildGaiaPedestrianCrosswalks(entities){
 if(!Array.isArray(entities))throw Error('Expected Gaia scene entities');
 const roads=entities.filter(e=>e?.enabled!==false&&validRoadSpline(e?.roadSpline));
 const junctions=entities.filter(e=>e?.enabled!==false&&validRoadJunction(e?.roadJunction3d));
 const crossings=[];
 for(const entity of junctions){
  const junction=entity.roadJunction3d;
  for(const roadId of junction.roadIds){
   const road=roads.find(r=>r.id===roadId);if(!road)continue;
   const samples=sampleRoadSpline(road.roadSpline);
   for(const approach of approachPoint(samples,junction.center,junction.radius+2.95)){
    const half=road.roadSpline.width/2,halfDepth=2.1;
    crossings.push({
     id:String(entity.id)+':'+roadId+':'+approach.direction,
     junctionId:entity.id,roadId,center:approach.point,
     normal:approach.normal,tangent:approach.tangent,
     halfWidth:half,halfDepth
    });
   }
  }
 }
 return crossings;
}
/** Distance to the nearest crossing requiring an AI car to yield; Infinity otherwise.
 * A pedestrian is considered committed only inside a crossing's road footprint.
 * The road ID and heading prevent unrelated adjacent lanes from braking.
 */
export function gaiaPedestrianYieldClearance(crosswalks,pedestrians,{roadId,position,forward,maxLookahead=20}={}){
 if(!Array.isArray(crosswalks)||!Array.isArray(pedestrians)||!position||!forward)return Infinity;
 const heading=len(forward);if(heading<1e-6)return Infinity;
 const facing={x:forward.x/heading,z:forward.z/heading};
 let clearance=Infinity;
 for(const crossing of crosswalks){
  if(crossing.roadId!==roadId)continue;
  const relative=sub(crossing.center,position);
  const ahead=dot(relative,facing);
  const side=Math.abs(facing.x*relative.z-facing.z*relative.x);
  if(ahead<0||ahead>maxLookahead||side>crossing.halfWidth+2)continue;
  if(dot(facing,crossing.tangent)<.3&&dot(facing,crossing.tangent)>-.3)continue;
  for(const person of pedestrians){
   const p=person.position;if(!Number.isFinite(p?.x)||!Number.isFinite(p?.z))continue;
   const delta=sub(p,crossing.center);
   const lengthwise=Math.abs(dot(delta,crossing.tangent));
   const across=Math.abs(dot(delta,crossing.normal));
   if(lengthwise<=crossing.halfDepth&&across<=crossing.halfWidth+.35){
    clearance=Math.min(clearance,Math.max(0,ahead-crossing.halfDepth-2));
   }
  }
 }
 return clearance;
}
