// WB 2.5 — opt-in urban traffic that drives native Rapier chassis.
// Network is derived from authored Gaia road splines; no duplicate road storage.
import {sampleRoadSpline,validRoadSpline} from './gaia-road-spline.js';
import {validRoadJunction} from './gaia-road-junctions.js';
import {buildGaiaPedestrianCrosswalks,gaiaPedestrianYieldClearance} from './gaia-pedestrian-crosswalks.js';
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
 return {lanes,junctions,crosswalks:buildGaiaPedestrianCrosswalks(entities)};
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
export function controlGaiaTrafficVehicle(network,{position,forward,speedMps=0,seconds=0,vehicleId=null,vehicles=[],pedestrians=[],maxSpeedMps=10,preferredLaneId=null}={}){
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
  // A directed junction transition may keep an outgoing lane selected while
  // the chassis is still steering onto it. Normal acquisition remains unchanged.
  const guidedCost=lane.id===preferredLaneId&&closest.distance<8?cost-10:cost;
  if(!best||guidedCost<best.cost)best={lane,closest,cost:guidedCost,alignment};
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
 clear=Math.min(clear,gaiaPedestrianYieldClearance(network.crosswalks||[],pedestrians,{roadId:lane.roadId,position,forward:facing}));
 for(const other of vehicles){
  if(other.id===vehicleId||!other.position)continue;
  // Compare against the continuous lane, not one sampled vertex: sparse
  // road samples otherwise miss a vehicle immediately ahead.
  const leader=closestPointOnPath(lane,other.position);
  const gap=leader.progress-closest.progress;
  if(leader.distance>2.2||gap<=0)continue;
  const relative={x:other.position.x-position.x,z:other.position.z-position.z};
  if(dot(facing,relative)>0)clear=Math.min(clear,gap-5);
 }
 const targetSpeed=Math.min(maxSpeedMps,lane.speedLimitMps,Math.sqrt(Math.max(0,clear)*4));
 const brake=speedMps>targetSpeed+.4?clamp((speedMps-targetSpeed)/3,0,1):0;
 const throttle=brake>0?0:clamp((targetSpeed-speedMps)*.32,0,1);
 return {throttle,steer:steering,brake,handbrake:0,status:targetSpeed<.3?'stopped':'following',laneId:lane.id,roadId:lane.roadId,targetSpeedMps:targetSpeed};
}

/**
 * WB 2.9a: deterministic, opt-in urban density feedback.
 * Vehicles remain real Rapier-driven chassis; this controller only changes
 * throttle/brake requests. Do not use it as a replacement for collision physics.
 */
export function gaiaTrafficLaneDensity(network,vehicles,{queueSpeedMps=1.4,vehicleLengthM=5}={}){
 if(!network||!Array.isArray(network.lanes)||!Array.isArray(vehicles)||
  !Number.isFinite(queueSpeedMps)||queueSpeedMps<0||
  !Number.isFinite(vehicleLengthM)||vehicleLengthM<=0)
  throw Error('Invalid Gaia traffic density input');
 return network.lanes.map(lane=>{
  const length=lane.points.reduce((sum,p,i,a)=>i?sum+dist(a[i-1],p):0,0);
  const members=[];
  for(const car of vehicles){
   if(!car?.position||!Number.isFinite(car.position.x)||!Number.isFinite(car.position.z))continue;
   const point=closestPointOnPath(lane,car.position);
   if(point.distance>2.2)continue;
   if(car.laneId!=null&&car.laneId!==lane.id)continue;
   members.push({id:car.id,progress:point.progress,speedMps:Number.isFinite(car.speedMps)?Math.max(0,car.speedMps):null});
  }
  members.sort((a,b)=>a.progress-b.progress||(String(a.id).localeCompare(String(b.id))));
  const queued=members.filter(car=>car.speedMps!==null&&car.speedMps<=queueSpeedMps).length;
  return {laneId:lane.id,roadId:lane.roadId,lengthM:length,vehicles:members.length,
   queued,occupiedRatio:length>0?clamp(members.length*vehicleLengthM/length,0,1):0,
   vehiclesPerKm:length>0?members.length*1000/length:0};
 });
}
export function controlGaiaCongestedTrafficVehicle(network,state={}){
 const base=controlGaiaTrafficVehicle(network,state);
 if(!base.laneId||base.status==='off-road'||base.status==='no-heading')return {...base,congestion:'unavailable'};
 const summaries=gaiaTrafficLaneDensity(network,state.vehicles||[]);
 const lane=summaries.find(item=>item.laneId===base.laneId);
 if(!lane)return {...base,congestion:'unavailable'};
 // Use occupancy as a *non-increasing* speed limit. A queue cannot override
 // a red light, pedestrian crossing, or a stopped vehicle already ahead.
 const congestionFactor=lane.occupiedRatio>=.8?.3:lane.occupiedRatio>=.5?.55:lane.occupiedRatio>=.25?.8:1;
 const limit=Math.min(base.targetSpeedMps,(state.maxSpeedMps??10)*congestionFactor);
 const actualSpeed=Math.max(0,Number.isFinite(state.speedMps)?state.speedMps:0);
 const brake=Math.max(base.brake,actualSpeed>limit+.4?clamp((actualSpeed-limit)/3,0,1):0);
 return {...base,targetSpeedMps:limit,brake,throttle:brake>0?0:Math.min(base.throttle,clamp((limit-actualSpeed)*.32,0,1)),
  status:limit<.3?'stopped':base.status,congestion:lane.occupiedRatio>=.5?'dense':lane.queued>0?'slow':'free',
  laneOccupancy:lane.occupiedRatio,queuedVehicles:lane.queued};
}

/**
 * WB 2.9b — Stateless deterministic stop-and-go driving planner.
 * A caller keeps 'previousTargetSpeedMps' between physics ticks. This planner
 * never moves a chassis: Rapier/vehicle dynamics remain authoritative.
 * Braking imposed by signals, crossings and WB 2.9a is never weakened.
 */
export function controlGaiaStopGoTrafficVehicle(network,state={},options={}){
 const {deltaSeconds=1/60,reactionSeconds=.75,headwaySeconds=1.25,
  standstillGapM=5,comfortableBrakeMps2=3,maxAccelerationMps2=1.8,
  previousTargetSpeedMps=null}=options;
 for(const v of [deltaSeconds,reactionSeconds,headwaySeconds,standstillGapM,
  comfortableBrakeMps2,maxAccelerationMps2]){
  if(!Number.isFinite(v))throw Error('Invalid stop-and-go tuning');
 }
 if(deltaSeconds<=0||deltaSeconds>1||reactionSeconds<0||reactionSeconds>5||
  headwaySeconds<0||headwaySeconds>5||standstillGapM<0||
  comfortableBrakeMps2<=0||maxAccelerationMps2<=0)
  throw Error('Invalid stop-and-go tuning');
 const baseline=controlGaiaCongestedTrafficVehicle(network,state);
 if(!baseline.laneId)return {...baseline,stopGo:'unavailable',leaderGapM:null,
  nextTargetSpeedMps:0};
 const lane=network.lanes.find(item=>item.id===baseline.laneId);
 const own=closestPointOnPath(lane,state.position);
 const speed=Math.max(0,Number.isFinite(state.speedMps)?state.speedMps:0);
 let gap=Infinity,leaderSpeed=null;
 for(const car of state.vehicles||[]){
  if(!car?.position||car.id===state.vehicleId)continue;
  if(car.laneId!=null&&car.laneId!==lane.id)continue;
  const point=closestPointOnPath(lane,car.position);
  if(point.distance>2.2||point.progress<=own.progress)continue;
  const distance=point.progress-own.progress-standstillGapM;
  if(distance<gap){gap=distance;leaderSpeed=Number.isFinite(car.speedMps)?Math.max(0,car.speedMps):0;}
 }
 // An approaching stationary queue must not be treated like a moving target.
 // Reaction time and following headway both enlarge the required clearance.
 const required=standstillGapM+speed*(reactionSeconds+headwaySeconds);
 const available=Math.max(0,gap);
 const followingLimit=leaderSpeed===null?Infinity:
  Math.max(0,leaderSpeed+Math.sqrt(Math.max(0,2*comfortableBrakeMps2*
   Math.max(0,available-speed*reactionSeconds))));
 // If the preceding vehicle is inside the required following distance,
 // do not command a speed above its own speed.
 const safeLeaderSpeed=leaderSpeed!==null&&gap<required-standstillGapM?
  Math.min(followingLimit,leaderSpeed):followingLimit;
 const safeTarget=Math.min(baseline.targetSpeedMps,safeLeaderSpeed);
 const prior=Number.isFinite(previousTargetSpeedMps)?
  Math.max(0,previousTargetSpeedMps):speed;
 const smoothTarget=Math.min(safeTarget,prior+maxAccelerationMps2*deltaSeconds);
 const brake=Math.max(baseline.brake,speed>smoothTarget+.25?
  clamp((speed-smoothTarget)/comfortableBrakeMps2,0,1):0);
 const throttle=brake>0?0:Math.min(baseline.throttle,
  clamp((smoothTarget-speed)*.32,0,1));
 return {...baseline,throttle,brake,targetSpeedMps:smoothTarget,
  nextTargetSpeedMps:smoothTarget,leaderGapM:leaderSpeed===null?null:gap,
  stopGo:leaderSpeed!==null&&gap<=standstillGapM?'queued':
   leaderSpeed!==null&&gap<required?'following':'cruising',
  status:smoothTarget<.3?'stopped':baseline.status};
}

/**
 * WB 2.9c — Derived curbside parking and opt-in stopping interactions.
 * These are planning/interaction decisions only. Rapier remains responsible
 * for steering, wheel forces, colliders and physical parking manoeuvres.
 */
export function gaiaTrafficParkingSpots(network,{spacingM=14,endMarginM=12,curbOffsetM=3,
 junctionClearanceM=12}={}){
 if(!network||!Array.isArray(network.lanes)||!Array.isArray(network.junctions)||
  ![spacingM,endMarginM,curbOffsetM,junctionClearanceM].every(Number.isFinite)||
  spacingM<5||endMarginM<0||curbOffsetM<=0||junctionClearanceM<0)
  throw Error('Invalid Gaia parking configuration');
 const spots=[];
 for(const lane of network.lanes){
  const total=lane.points.reduce((sum,p,i,a)=>i?sum+dist(a[i-1],p):0,0);
  for(let progress=endMarginM;progress<=total-endMarginM;progress+=spacingM){
   const point=targetAt(lane,progress);
   const prev=targetAt(lane,Math.max(0,progress-.2)),next=targetAt(lane,Math.min(total,progress+.2));
   const dx=next.x-prev.x,dz=next.z-prev.z,length=Math.hypot(dx,dz);
   if(length<1e-6)continue;
   // Gaia traffic lanes are already offset from road centre. The left-hand
   // normal here points outward to the same side as each offset lane.
   const normal={x:-dz/length,z:dx/length};
   const curb={x:point.x+normal.x*curbOffsetM,z:point.z+normal.z*curbOffsetM};
   if(network.junctions.some(j=>dist(j.center,point)<j.radius+junctionClearanceM))continue;
   spots.push({id:lane.id+':park:'+Math.round(progress*100),
    laneId:lane.id,roadId:lane.roadId,progressM:progress,
    approach:{x:point.x,z:point.z},position:curb,
    heading:{x:dx/length,z:dz/length}});
  }
 }
 return spots;
}
export function gaiaTrafficParkingOccupancy(spots,vehicles,{occupancyRadiusM=2.8}={}){
 if(!Array.isArray(spots)||!Array.isArray(vehicles)||
  !Number.isFinite(occupancyRadiusM)||occupancyRadiusM<=0)throw Error('Invalid parking occupancy input');
 // A physical vehicle occupying a stall takes priority over a stale ID.
 return spots.map(spot=>{
  const occupying=vehicles.find(car=>car?.position&&Number.isFinite(car.position.x)&&
   Number.isFinite(car.position.z)&&dist(car.position,spot.position)<=occupancyRadiusM);
  return {...spot,occupiedBy:occupying?.id??null,available:!occupying};
 });
}
export function controlGaiaParkingVehicle(network,state={},options={}){
 const {parkingSpotId=null,parkingSpots=null,previousTargetSpeedMps=null,
  deltaSeconds=1/60,parkedSpeedMps=.3,stopBufferM=1.5}=options;
 if(!Number.isFinite(parkedSpeedMps)||parkedSpeedMps<0||
  !Number.isFinite(stopBufferM)||stopBufferM<0)throw Error('Invalid Gaia parking control');
 const baseline=controlGaiaStopGoTrafficVehicle(network,state,{deltaSeconds,previousTargetSpeedMps});
 if(parkingSpotId===null)return {...baseline,parking:'not-requested'};
 const spots=parkingSpots??gaiaTrafficParkingSpots(network);
 const spot=spots.find(s=>s.id===parkingSpotId);
 if(!spot)return {...baseline,throttle:0,brake:1,parking:'invalid-spot'};
 if(!baseline.laneId||spot.laneId!==baseline.laneId)return {...baseline,throttle:0,brake:1,parking:'wrong-lane'};
 const taken=gaiaTrafficParkingOccupancy([spot],state.vehicles||[])[0];
 if(!taken.available&&taken.occupiedBy!==state.vehicleId)
  return {...baseline,throttle:0,brake:1,parking:'occupied'};
 const lane=network.lanes.find(l=>l.id===spot.laneId);
 const current=closestPointOnPath(lane,state.position).progress;
 const remaining=spot.progressM-current-stopBufferM;
 const speed=Math.max(0,Number.isFinite(state.speedMps)?state.speedMps:0);
 // Approaching a parking entrance is a longitudinal speed plan, not an
 // unsupported lateral manoeuvre or a teleport to the curbside stall.
 const limit=remaining<=0?0:Math.sqrt(2*2.5*remaining);
 const targetSpeed=Math.min(baseline.targetSpeedMps,limit);
 const brake=Math.max(baseline.brake,speed>targetSpeed+.2?
  clamp((speed-targetSpeed)/2.5,0,1):0);
 const stopped=remaining<=.5&&speed<=parkedSpeedMps;
 return {...baseline,parking:stopped?'stopped':remaining<0?'overshot':'approaching',
  parkingSpotId:spot.id,remainingToStopM:remaining,
  targetSpeedMps:targetSpeed,nextTargetSpeedMps:targetSpeed,
  throttle:stopped||brake>0?0:Math.min(baseline.throttle,clamp((targetSpeed-speed)*.32,0,1)),
  brake:stopped?1:brake,handbrake:stopped?1:baseline.handbrake,
  status:stopped?'parked':baseline.status};
}
export function gaiaVehicleParkingInteraction(spot,actor,vehicle,{action='enter',
 maxDistanceM=2.5,maxExitSpeedMps=.3}={}){
 if(!spot?.position||!actor?.position||!vehicle?.position||
  !['enter','exit'].includes(action)||!Number.isFinite(maxDistanceM)||
  maxDistanceM<=0||!Number.isFinite(maxExitSpeedMps)||maxExitSpeedMps<0)
  throw Error('Invalid Gaia vehicle parking interaction');
 const actorDistanceM=dist(actor.position,vehicle.position),
  parkedDistanceM=dist(spot.position,vehicle.position),
  speed=Math.max(0,Number.isFinite(vehicle.speedMps)?vehicle.speedMps:Infinity);
 const stopped=speed<=maxExitSpeedMps;
 const atSpot=parkedDistanceM<=3;
 const allowed=stopped&&atSpot&&(action==='exit'||actorDistanceM<=maxDistanceM);
 return {action,allowed,reason:!stopped?'vehicle-moving':!atSpot?'not-parked':
  action==='enter'&&actorDistanceM>maxDistanceM?'out-of-range':'ready',
  actorDistanceM,parkedDistanceM};
}

/**
 * WB 2.8a: render-only signal coordinates from authored junction and roads.
 * Signal locations have no physics or independent state; the same
 * gaiaTrafficLight() function determines both traffic decisions and colors.
 */
let visibleTrafficSeconds=0;
export const setGaiaTrafficSignalSeconds=seconds=>{
 if(Number.isFinite(seconds))visibleTrafficSeconds=seconds;
};
export const gaiaTrafficSignalSeconds=()=>visibleTrafficSeconds;
export function gaiaJunctionSignalPositions(junction,roadEntities,seconds=visibleTrafficSeconds){
 if(!validRoadJunction(junction)||!Array.isArray(roadEntities)||!Number.isFinite(seconds))
  throw Error('Invalid Gaia traffic signal sources');
 const signals=[];
 for(const roadId of junction.roadIds){
  const entity=roadEntities.find(e=>e.id===roadId&&validRoadSpline(e.roadSpline)&&e.enabled!==false);
  if(!entity)continue;
  const pts=sampleRoadSpline(entity.roadSpline),center=junction.center;
  let tangent=null,distance=Infinity;
  for(let i=1;i<pts.length;i++){
   const a=pts[i-1],b=pts[i],dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz);
   if(len<1e-6)continue;
   const t=clamp(((center.x-a.x)*dx+(center.z-a.z)*dz)/(len*len),0,1);
   const dist=Math.hypot(center.x-(a.x+dx*t),center.z-(a.z+dz*t));
   if(dist<distance){distance=dist;tangent={x:dx/len,z:dz/len};}
  }
  if(!tangent||distance>junction.radius+2)continue;
  const lateral={x:-tangent.z,z:tangent.x};
  const setback=junction.radius+2.5,side=entity.roadSpline.width/2+1.1;
  for(const direction of [-1,1]){
   const approach={x:center.x+tangent.x*setback*direction,z:center.z+tangent.z*setback*direction};
   // On the right side of approaching traffic (opposite travel direction).
   const x=approach.x+lateral.x*side*direction,z=approach.z+lateral.z*side*direction;
   signals.push({roadId,direction,x,z,color:gaiaTrafficLight(junction,roadId,seconds)});
  }
 }
 return signals;
}
