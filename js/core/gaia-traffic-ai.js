// WB 2.5 — opt-in urban traffic that drives native Rapier chassis.
// Network is derived from authored Gaia road splines; no duplicate road storage.
import {sampleRoadSpline,validRoadSpline} from './gaia-road-spline.js';
import {validRoadJunction} from './gaia-road-junctions.js';
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const dot=(a,b)=>a.x*b.x+a.z*b.z;
const cross=(a,b)=>a.x*b.z-a.z*b.x;
export const TRAFFIC_AI_SCHEMA='warlike.traffic.ai.v1';

export function buildGaiaTrafficNetwork(entities,{laneOffsetRatio=.25,segmentsPerSpan=12}={}){
 if(!Array.isArray(entities)||!Number.isFinite(laneOffsetRatio)||laneOffsetRatio<=0||laneOffsetRatio>=.45)throw Error('Invalid Gaia traffic network');
 const lanes=[];
 const roads=entities.filter(e=>e.enabled!==false&&validRoadSpline(e.roadSpline));
 for(const entity of roads){
  const samples=sampleRoadSpline(entity.roadSpline,{segmentsPerSpan});
  if(samples.length<2)continue;
  const offset=entity.roadSpline.width*laneOffsetRatio;
  for(const direction of [1,-1]){
   const ordered=direction===1?samples:[...samples].reverse();
   const points=ordered.map((p,i)=>{
    const prev=ordered[Math.max(0,i-1)],next=ordered[Math.min(ordered.length-1,i+1)],
     dx=next.x-prev.x,dz=next.z-prev.z,n=Math.hypot(dx,dz)||1;
    return {x:p.x-dz/n*offset,z:p.z+dx/n*offset};
   });
   lanes.push({id:entity.id+':'+direction,roadId:entity.id,direction,points,speedLimitMps:Math.max(2,Math.min(20,Number(entity.roadSpeedLimitMps)||10))});
  }
 }
 const junctions=entities.filter(e=>e.enabled!==false&&validRoadJunction(e.roadJunction3d))
  .map(e=>({...e.roadJunction3d,id:e.id}));
 return {lanes,junctions};
}
function closestPointOnPath(lane,pos){
 let best={distance:Infinity,index:0,t:0,progress:0},elapsed=0;
 const points=lane.points;
 for(let i=1;i<points.length;i++){
  const a=points[i-1],b=points[i],dx=b.x-a.x,dz=b.z-a.z,len2=dx*dx+dz*dz;
  if(len2<1e-12)continue;
  const t=clamp(((pos.x-a.x)*dx+(pos.z-a.z)*dz)/len2,0,1);
  const point={x:a.x+dx*t,z:a.z+dz*t},distance=dist(pos,point);
  if(distance<best.distance)best={distance,index:i-1,t,progress:elapsed+Math.sqrt(len2)*t};
  elapsed+=Math.sqrt(len2);
 }
 return best;
}
function targetAt(lane,meters){
 let walked=0;
 for(let i=1;i<lane.points.length;i++){
  const a=lane.points[i-1],b=lane.points[i],len=dist(a,b);
  if(walked+len>=meters&&len>1e-9){
   const t=(meters-walked)/len;
   return {x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t};
  }
  walked+=len;
 }
 return lane.points.at(-1);
}
export function gaiaTrafficLight(junction,roadId,seconds){
 if(!validRoadJunction(junction))throw Error('Invalid traffic junction');
 if(!Number.isFinite(seconds))throw Error('Invalid traffic time');
 const phase=((seconds%30)+30)%30;
 const first=junction.roadIds[0]===roadId;
 if(!junction.roadIds.includes(roadId))return 'uncontrolled';
 // Both approaches red during the all-red changeover.
 if(phase>=13&&phase<15||phase>=28)return 'red';
 return phase<13?(first?'green':'red'):(first?'red':'green');
}
function nextStop(lane,network,pos,elapsed,seconds){
 let closest=Infinity;
 for(const junction of network.junctions){
  if(!junction.roadIds.includes(lane.roadId))continue;
  const point=closestPointOnPath(lane,junction.center);
  const remaining=point.progress-elapsed;
  if(remaining<-.5||remaining>20)continue;
  if(gaiaTrafficLight(junction,lane.roadId,seconds)==='green')continue;
  closest=Math.min(closest,remaining-junction.radius-1.5);
 }
 return closest;
}
export function controlGaiaTrafficVehicle(network,{position,forward,speedMps=0,seconds=0,vehicleId=null,vehicles=[],maxSpeedMps=10}={}){
 if(!network||!Array.isArray(network.lanes)||!position||!forward)throw Error('Invalid traffic controller');
 const fw=Math.hypot(forward.x,forward.z);
 if(fw<1e-6)return {throttle:0,steer:0,brake:1,handbrake:0,status:'no-heading'};
 const facing={x:forward.x/fw,z:forward.z/fw};
 let best=null;
 for(const lane of network.lanes){
  const closest=closestPointOnPath(lane,position);
  const point=lane.points[Math.min(lane.points.length-1,closest.index+1)],base=lane.points[closest.index];
  const delta={x:point.x-base.x,z:point.z-base.z},n=Math.hypot(delta.x,delta.z)||1;
  const alignment=dot(facing,{x:delta.x/n,z:delta.z/n});
  // Direction matters: nearby oncoming lanes must not hijack AI.
  const cost=closest.distance+(1-alignment)*3;
  if(!best||cost<best.cost)best={lane,closest,cost,alignment};
 }
 if(!best||best.closest.distance>Math.max(8,best.lane.points.length?best.lane.speedLimitMps:8))
  return {throttle:0,steer:0,brake:1,handbrake:0,status:'off-road'};
 const {lane,closest}=best;
 const target=targetAt(lane,closest.progress+clamp(3+Math.abs(speedMps)*.5,3,10));
 const delta={x:target.x-position.x,z:target.z-position.z},m=Math.hypot(delta.x,delta.z)||1;
 const desired={x:delta.x/m,z:delta.z/m};
 const steering=clamp(Math.atan2(cross(facing,desired),dot(facing,desired))/.65,-1,1);
 const total=lane.points.reduce((sum,p,i,a)=>i?sum+dist(a[i-1],p):0,0);
 let clear=Math.max(0,total-closest.progress-2);
 clear=Math.min(clear,nextStop(lane,network,position,closest.progress,seconds));
 for(const other of vehicles){
  if(other.id===vehicleId||!other.position)continue;
  const lateral=dist(other.position,lane.points[Math.min(lane.points.length-1,closest.index)]);
  if(lateral>7)continue;
  const relative={x:other.position.x-position.x,z:other.position.z-position.z};
  const ahead=dot(facing,relative);
  const across=Math.abs(cross(facing,relative));
  if(ahead>0&&across<2.2)clear=Math.min(clear,ahead-5);
 }
 const targetSpeed=Math.min(maxSpeedMps,lane.speedLimitMps,Math.sqrt(Math.max(0,clear)*4));
 const brake=speedMps>targetSpeed+.4?clamp((speedMps-targetSpeed)/3,0,1):0;
 const throttle=brake>0?0:clamp((targetSpeed-speedMps)*.32,0,1);
 return {throttle,steer:steering,brake,handbrake:0,status:targetSpeed<.3?'stopped':'following',laneId:lane.id,roadId:lane.roadId,targetSpeedMps:targetSpeed};
}
