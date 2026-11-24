// WB 2.7a — deterministic lane-to-lane links for physical Gaia road junctions.
// Pure navigation topology: all coordinates are metres, XZ horizontal, Y-up.
// Existing Gaia road splines and junctions remain the only authored sources.
import {validRoadJunction} from './gaia-road-junctions.js';

const finite=Number.isFinite;
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const lerp=(a,b,t)=>({x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t});
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
const cross=(a,b)=>a.x*b.z-a.z*b.x;

function projection(lane,point){
 let result={distance:Infinity,progress:0,segment:0},travelled=0;
 for(let i=1;i<lane.points.length;i++){
  const a=lane.points[i-1],b=lane.points[i],dx=b.x-a.x,dz=b.z-a.z,length=Math.hypot(dx,dz);
  if(length<1e-8)continue;
  const t=clamp(((point.x-a.x)*dx+(point.z-a.z)*dz)/(length*length),0,1);
  const p=lerp(a,b,t),gap=distance(point,p);
  if(gap<result.distance)result={distance:gap,progress:travelled+length*t,segment:i-1};
  travelled+=length;
 }
 return {...result,length:travelled};
}
function positionAt(lane,travel){
 let elapsed=0;
 for(let i=1;i<lane.points.length;i++){
  const a=lane.points[i-1],b=lane.points[i],d=distance(a,b);
  if(d<1e-8)continue;
  if(elapsed+d>=travel)return lerp(a,b,clamp((travel-elapsed)/d,0,1));
  elapsed+=d;
 }
 return lane.points.at(-1);
}
function tangentAt(lane,travel){
 const a=positionAt(lane,Math.max(0,travel-.25)),b=positionAt(lane,travel+.25);
 const d=distance(a,b)||1;
 return {x:(b.x-a.x)/d,z:(b.z-a.z)/d};
}
function validLane(lane){
 return !!lane&&typeof lane.id==='string'&&Number.isSafeInteger(lane.roadId)&&
 Array.isArray(lane.points)&&lane.points.length>=2&&
 lane.points.every(p=>finite(p?.x)&&finite(p?.z));
}
/**
 * Produce directed turn connectors between different roads at a native junction.
 * Reject disconnected/invalid junctions and never connect a nearby overpass.
 * Each connector has approach, centre and exit points for preview/navigation.
 */
export function buildGaiaJunctionLaneConnectors(network){
 if(!network||!Array.isArray(network.lanes)||!Array.isArray(network.junctions))
  throw Error('Invalid Gaia traffic network');
 const connectors=[];
 for(const junction of network.junctions){
  if(!validRoadJunction(junction))continue;
  const lanes=network.lanes.filter(l=>validLane(l)&&junction.roadIds.includes(l.roadId));
  const hits=lanes.map(l=>({lane:l,hit:projection(l,junction.center)}))
   .filter(x=>x.hit.distance<=junction.radius+2&&x.hit.progress>0.5&&x.hit.length-x.hit.progress>0.5);
  for(const from of hits)for(const to of hits){
   if(from.lane.roadId===to.lane.roadId)continue;
   const approach=Math.min(Math.max(1.5,junction.radius*.55),from.hit.progress-.25);
   const exit=Math.min(Math.max(1.5,junction.radius*.55),to.hit.length-to.hit.progress-.25);
   if(approach<=0||exit<=0)continue;
   const entry=positionAt(from.lane,from.hit.progress-approach);
   const leave=positionAt(to.lane,to.hit.progress+exit);
   const directionA=tangentAt(from.lane,from.hit.progress),directionB=tangentAt(to.lane,to.hit.progress);
   const angle=Math.atan2(cross(directionA,directionB),directionA.x*directionB.x+directionA.z*directionB.z);
   // A deterministic centre control point; actual motion must be driven via Rapier.
   const middle={x:(entry.x+leave.x+junction.center.x)/3,z:(entry.z+leave.z+junction.center.z)/3};
   const points=[];
   for(let i=0;i<=12;i++){
    const t=i/12,u=1-t;
    points.push({x:u*u*entry.x+2*u*t*middle.x+t*t*leave.x,
      z:u*u*entry.z+2*u*t*middle.z+t*t*leave.z});
   }
   connectors.push({id:String(junction.id??junction.roadIds.join('-'))+':'+from.lane.id+'>'+to.lane.id,
    junctionId:junction.id??null,fromLaneId:from.lane.id,toLaneId:to.lane.id,
    fromRoadId:from.lane.roadId,toRoadId:to.lane.roadId,
    turn:Math.abs(angle)<.35?'straight':angle>0?'left':'right',
    entryProgress:from.hit.progress-approach,exitProgress:to.hit.progress+exit,points});
  }
 }
 return connectors;
}
/** Shortest graph route by junction count; empty array means disconnected. */
export function findGaiaLaneRoute(network,fromLaneId,toLaneId){
 if(!network?.lanes?.some(l=>l.id===fromLaneId)||!network.lanes.some(l=>l.id===toLaneId))
  return null;
 if(fromLaneId===toLaneId)return {laneIds:[fromLaneId],connectors:[]};
 const edges=buildGaiaJunctionLaneConnectors(network),queue=[fromLaneId],seen=new Set(queue),parents=new Map();
 for(let i=0;i<queue.length;i++){
  const current=queue[i];
  for(const edge of edges){
   if(edge.fromLaneId!==current||seen.has(edge.toLaneId))continue;
   parents.set(edge.toLaneId,{previous:current,edge});seen.add(edge.toLaneId);
   if(edge.toLaneId===toLaneId){
    const laneIds=[toLaneId],connectors=[];let at=toLaneId;
    while(at!==fromLaneId){const step=parents.get(at);connectors.unshift(step.edge);at=step.previous;laneIds.unshift(at)}
    return {laneIds,connectors};
   }
   queue.push(edge.toLaneId);
  }
 }
 return null;
}
