// WB 2.9f: Public runtime bridge, usable by a game or editor without
// importing editor code. Physics, transforms, camera and animation remain
// the responsibility of the active Play runtime.
import {planGaiaParkingSteering} from './gaia-parking-steering.js';
import {planGaiaVehicleSeatTransition,applyGaiaVehicleSeatTransition} from './gaia-vehicle-seat-interactions.js';

export function evaluateGaiaParkingRuntime(network,vehicleState,options){
 const inputs=planGaiaParkingSteering(network,vehicleState,options);
 return {inputs:{
  throttle:inputs.throttle,steer:inputs.steer,brake:inputs.brake,
  handbrake:inputs.handbrake
 },status:inputs.parking,steering:inputs.parkingSteering,
  targetSpeedMps:inputs.targetSpeedMps??0,
  nextTargetSpeedMps:inputs.nextTargetSpeedMps??0};
}
export function commitGaiaParkingSeatAction(vehicle,actor,spot,action){
 const decision=planGaiaVehicleSeatTransition({vehicle,actor,spot,action});
 if(!decision.allowed)return {allowed:false,reason:decision.reason,vehicle};
 return {allowed:true,reason:'ready',
  vehicle:applyGaiaVehicleSeatTransition(vehicle,decision),event:decision.event,
  actorId:decision.actorId};
}

// WB 2.9g — deterministic driver ownership guard for playable 3D vehicles.
// Does not mutate entities or override the active physics/camera controller.
export function gaiaDriverSeatAccess(vehicle,actorId,action='enter'){
 if(!vehicle||actorId==null||!['enter','exit'].includes(action))
  return {allowed:false,reason:'invalid-driver-action'};
 const occupant=vehicle.vehicleSystems?.seats?.driverId??null;
 if(action==='enter'&&occupant!=null&&occupant!==actorId)
  return {allowed:false,reason:'driver-occupied'};
 if(action==='exit'&&occupant!==actorId)
  return {allowed:false,reason:'not-driver'};
 return {allowed:true,reason:'ready'};
}

/**
 * Compute the driver's Play anchor in scene units. Authored local offsets are
 * optional; the existing vehicle center remains the backwards-compatible default.
 * The position is derived on every frame, never baked into the project entity.
 */
export function gaiaDriverSeatPose(vehicle,actor){
 if(!vehicle||!actor)throw Error('Missing vehicle or actor');
 const width=Number(vehicle.w)||32,depth=Number(vehicle.depth3d||vehicle.h)||32;
 const actorWidth=Number(actor.w)||32,actorDepth=Number(actor.depth3d||actor.h)||32;
 const anchor=vehicle.vehicleSystems?.seats?.driverAnchor;
 const localX=Number.isFinite(anchor?.x)?anchor.x:0;
 const localY=Number.isFinite(anchor?.y)?anchor.y:0;
 const radians=(Number(vehicle.rotation)||0)*Math.PI/180;
 const x=localX*Math.cos(radians)-localY*Math.sin(radians);
 const y=localX*Math.sin(radians)+localY*Math.cos(radians);
 return {
  x:(Number(vehicle.x)||0)+(width-actorWidth)/2+x,
  y:(Number(vehicle.y)||0)+(depth-actorDepth)/2+y,
  elevation3d:(Number(vehicle.elevation3d)||0)+(Number.isFinite(anchor?.elevation3d)?anchor.elevation3d:0)
 };
}
export function placeGaiaDriverAtSeat(vehicle,actor){
 const pose=gaiaDriverSeatPose(vehicle,actor);
 actor.x=pose.x;actor.y=pose.y;actor.elevation3d=pose.elevation3d;
 actor._hiddenInVehicle=true;
 actor.animation='drive';
 return pose;
}

/**
 * Opt-in Play transition. Clip names are authored by the vehicle/prefab;
 * fallback clips preserve the legacy behaviour if no clips are provided.
 * Scene coordinates are used by the existing vehicle-3d controller.
 */
export function beginGaiaDriverTransition(vehicle,actor,action,target){
 const cfg=vehicle?.vehicleSystems?.seats?.transition;
 if(cfg?.enabled!==true)return null;
 if(!vehicle||!actor||!['enter','exit'].includes(action)||!target||
  !Number.isFinite(target.x)||!Number.isFinite(target.y))return null;
 const seconds=Number(cfg[action==='enter'?'enterSeconds':'exitSeconds']);
 return {action,vehicleId:vehicle.id,actorId:actor.id,elapsed:0,
  duration:Number.isFinite(seconds)?Math.max(.1,Math.min(5,seconds)):0.85,
  from:{x:actor.x,y:actor.y,elevation3d:actor.elevation3d||0},
  to:{x:target.x,y:target.y,elevation3d:target.elevation3d||0},
  clip:cfg[action==='enter'?'enterClip':'exitClip']||(action==='enter'?'vehicle-enter':'vehicle-exit')};
}
export function advanceGaiaDriverTransition(transition,vehicle,actor,dt){
 if(!transition||vehicle?.id!==transition.vehicleId||actor?.id!==transition.actorId)
  return {done:true,invalid:true};
 const step=Math.max(0,Math.min(.1,Number(dt)||0));
 transition.elapsed=Math.min(transition.duration,transition.elapsed+step);
 const t=transition.elapsed/transition.duration;
 const smooth=t*t*(3-2*t);
 for(const key of ['x','y','elevation3d'])
  actor[key]=transition.from[key]+(transition.to[key]-transition.from[key])*smooth;
 actor.animation=transition.clip;
 // Keep the actor visible during the authored clip; hide only once seated.
 actor._hiddenInVehicle=false;
 return {done:t>=1,invalid:false,progress:t};
}

/**
 * Plan a collision-tested exit around the actual heading of the chassis.
 * All values use the existing 3D scene entity units. The caller supplies
 * its active Rapier/collision query as canPlace; no scene transforms mutate.
 */
export function gaiaSafeDriverExit(vehicle,actor,{canPlace,clearance=12}={}){
 if(!vehicle||!actor||typeof canPlace!=='function')throw Error('Invalid Gaia exit query');
 const w=Math.max(1,Number(vehicle.w)||32),d=Math.max(1,Number(vehicle.depth3d||vehicle.h)||32);
 const aw=Math.max(1,Number(actor.w)||32),ad=Math.max(1,Number(actor.depth3d||actor.h)||32);
 const cx=(Number(vehicle.x)||0)+w/2,cy=(Number(vehicle.y)||0)+d/2;
 const a=(Number(vehicle.rotation)||0)*Math.PI/180;
 const right={x:Math.cos(a),y:Math.sin(a)},forward={x:Math.sin(a),y:-Math.cos(a)};
 const space=Math.max(4,Math.min(128,Number(clearance)||12));
 const offsets=[
  {dx:-(w/2+aw/2+space),dy:0,side:'left'},
  {dx:w/2+aw/2+space,dy:0,side:'right'},
  {dx:0,dy:-(d/2+ad/2+space),side:'rear'},
  {dx:0,dy:d/2+ad/2+space,side:'front'}
 ];
 const elevation3d=Number(vehicle.elevation3d)||0;
 for(const offset of offsets){
  const x=cx+right.x*offset.dx+forward.x*offset.dy-aw/2;
  const y=cy+right.y*offset.dx+forward.y*offset.dy-ad/2;
  const pose={x,y,elevation3d};
  if(canPlace(pose))return {...pose,side:offset.side};
 }
 return null;
}
