import {solidBody3d,moveBody3d} from './collision-3d.js';
import {vehicleTuning} from './vehicle-controller.js';
import {resolveInputKeys} from './input-actions.js';
import {collisionBackend3d} from './collision-backend-3d.js';
import {vehicleComponents,canDriveVehicle,tickVehicleSystems,impactVehicle} from './vehicle-components.js';
import {fireVehicleWeapon,tickVehicleWeapon,vehicleWeaponConfig} from './vehicle-weapons-3d.js';
import {recordEngineEvent} from './engine-diagnostics.js';
import {gaiaDriverSeatAccess} from './gaia-parking-runtime.js';
import {stepArcadeVehicle} from './arcade-driving.js';
import {aircraftPilotInput,releaseAircraftControls,canSafelyExitAircraft} from './aircraft-pilot-input.js';
import {stepAircraftSystems} from './aircraft-systems.js';
import {vehicleConfiguration,tickVehicleArticulation} from './vehicle-articulation.js';
import {get3dAsset} from '../assets/catalog-3d.js';
const center=o=>({x:o.x+(o.w||32)/2,y:o.y+(o.depth3d||o.h||32)/2});
export const isDriveable3d=o=>!!o&&o.vehicleController?.enabled!==false&&(o.vehicleController?.enabled===true||o.groundVehiclePhysics?.enabled===true||o.aircraftPhysics?.enabled===true||o.vehicleConfig?.driveable===true||vehicleConfiguration(o)?.enabled===true&&vehicleConfiguration(o)?.drive!=='static'||o.tags?.includes('race-vehicle')||get3dAsset(o.assetId||o.model3dId)?.category==='Vehicles');
export const driving3d={vehicleId:null,speed:0,steer:0,enterHeld:false,impact:0};
export const currentVehicle3d=entities=>entities.find(o=>o.id===driving3d.vehicleId&&isDriveable3d(o))||null;
export const resetDriving3d=()=>Object.assign(driving3d,{vehicleId:null,speed:0,steer:0,enterHeld:false,impact:0});
const solid=(o,car,player)=>o!==car&&o!==player&&solidBody3d(o);
const intersects=(car,x,y,o)=>{
 const w=Math.max(1,car.w||32),d=Math.max(1,car.depth3d||car.h||32);
 const otherW=Math.max(1,o.w||32),otherD=Math.max(1,o.depth3d||o.h||32);
 const verticalBase=Number(car.elevation3d)||0,verticalTop=verticalBase+Math.max(.1,(car.h||32)/64);
 const otherBase=Number(o.elevation3d)||0,otherTop=otherBase+Math.max(.1,(o.h||32)/64);
 return verticalBase<otherTop&&verticalTop>otherBase&&x<o.x+otherW&&x+w>o.x&&y<o.y+otherD&&y+d>o.y;
};
export function updateDriving3d(entities,player,keys,dt,{pressedKeys=new Set()}={}){
 const inputVehicle=currentVehicle3d(entities);
 keys=resolveInputKeys(inputVehicle||player,keys,{context:inputVehicle?'vehicle':'player'});
 pressedKeys=resolveInputKeys(inputVehicle||player,pressedKeys,{context:inputVehicle?'vehicle':'player'});
 const step=Math.min(.1,Math.max(0,Number(dt)||0));
 driving3d.impact=Math.max(0,driving3d.impact-step);
 const enter=keys.has('e')||pressedKeys.has('e');
 const car=currentVehicle3d(entities);
 if(enter&&!driving3d.enterHeld){
  if(car){
   // Only the reserved driver may release controls or exit the vehicle.
   if(!gaiaDriverSeatAccess(car,player?.id,'exit').allowed){driving3d.enterHeld=enter;return true;}
   // An aircraft exit requires a safe landing. No ejection/parachute yet.
   if(car.aircraftPhysics?.enabled&&!canSafelyExitAircraft(car)){
    driving3d.enterHeld=enter;
    return true;
   }
   const width=Math.max(1,player.w||32),depth=Math.max(1,player.depth3d||player.h||32);
   const exits=[
    {x:car.x-width-12,y:car.y+((car.depth3d||car.h||32)-depth)/2},
    {x:car.x+(car.w||32)+12,y:car.y+((car.depth3d||car.h||32)-depth)/2}
   ];
   const backend=collisionBackend3d();
   const free=exits.find(pos=>backend?.owns(player)?backend.canPlace(player,{...pos,elevation3d:car.elevation3d||0},{ignore:car}):!entities.some(o=>solid(o,car,player)&&intersects({...player,depth3d:depth},pos.x,pos.y,o)));
   if(free){if(car.groundVehiclePhysics?.enabled)car.groundVehicleInput={throttle:0,steer:0,brake:0,handbrake:0};if(car.aircraftPhysics?.enabled)car.aircraftInput=releaseAircraftControls(car.aircraftInput);player._vehicleInputConsumed=true;recordEngineEvent('vehicle-exit',car.name);player.x=free.x;player.y=free.y;player.elevation3d=car.elevation3d||0;player._hiddenInVehicle=false;player.animation='idle';vehicleComponents(car).seats.driverId=null;resetDriving3d()}
  }else if(player){
   const p=center(player);
   const candidates=entities.filter(o=>o!==player&&isDriveable3d(o)&&o.sequenceEnabled!==false&&!o._sequenceDestroyed).map(o=>({o,d:Math.hypot(center(o).x-p.x,center(o).y-p.y)})).sort((a,b)=>a.d-b.d);
   const nearest=candidates[0];
   if(nearest&&Math.abs((Number(nearest.o.elevation3d)||0)-(Number(player.elevation3d)||0))<1.8&&nearest.d<Math.max(150,(nearest.o.w||64)*.85)&&canDriveVehicle(nearest.o)&&gaiaDriverSeatAccess(nearest.o,player.id,'enter').allowed){
    vehicleComponents(nearest.o).seats.driverId=player.id;
    if(player.battlefield?.enabled)nearest.o.team=player.team;
    player._vehicleInputConsumed=true;recordEngineEvent('vehicle-enter',nearest.o.name);driving3d.vehicleId=nearest.o.id;driving3d.speed=0;driving3d.steer=0;player._hiddenInVehicle=true;player.animation='drive';
   }
  }
 }
 driving3d.enterHeld=enter;
 const drivingCar=currentVehicle3d(entities);
 if(!drivingCar||!player)return false;
 tickVehicleWeapon(drivingCar,step);
 if(keys.has('f')&&vehicleWeaponConfig(drivingCar)){
  const shot=fireVehicleWeapon(drivingCar,entities);
  if(shot.fired)recordEngineEvent(shot.hit?'vehicle-weapon-hit':'vehicle-weapon-fire',shot.hit?shot.target:drivingCar.name);
 }
 const inputThrottle=Number(keys.has('w')||keys.has('z')||keys.has('arrowup'))-Number(keys.has('s')||keys.has('arrowdown'));
 const systems=vehicleComponents(drivingCar);
 const allowedGear=systems.transmission.mode!=='manual'||(inputThrottle<0?systems.transmission.gear===-1:systems.transmission.gear>0);
 const throttle=canDriveVehicle(drivingCar)&&allowedGear?inputThrottle:0;
 const steer=Number(keys.has('d')||keys.has('arrowright'))-Number(keys.has('a')||keys.has('q')||keys.has('arrowleft'));
 const handbrake=keys.has(' ')||keys.has('space');
 // Aircraft receive stick, throttle and collective controls. The fixed
 // Rapier step applies forces; never move the aircraft with arcade transforms.
 if(drivingCar.aircraftPhysics?.enabled){
  drivingCar.aircraftInput=aircraftPilotInput(drivingCar.aircraftPhysics.kind,drivingCar.aircraftInput,keys,step);
  drivingCar.aircraftGearInput={brake:keys.has(' ')||keys.has('space')?1:0};
  if(drivingCar.aircraftSystems?.enabled)stepAircraftSystems(drivingCar.aircraftSystems,drivingCar.aircraftPhysics.kind,keys,step,drivingCar.aircraftPhysics.kind==='helicopter'?drivingCar.aircraftInput.collective:drivingCar.aircraftInput.throttle);
  const v=drivingCar.rigidbody3d;
  driving3d.speed=v?Math.hypot(Number(v.vx)||0,Number(v.vy)||0,Number(v.vz)||0):0;
  player.x=drivingCar.x+((drivingCar.w||32)-(player.w||32))/2;
  player.y=drivingCar.y+((drivingCar.depth3d||drivingCar.h||32)-(player.depth3d||player.h||32))/2;
  player.elevation3d=drivingCar.elevation3d||0;
  player._hiddenInVehicle=true;player.animation='drive';
  drivingCar.animation='fly';
  return true;
 }
 // Ground vehicles use live Rapier impulses, not the legacy arcade transform.
 // The controls are authored per-frame and consumed by the fixed physics step.
 if(drivingCar.groundVehiclePhysics?.enabled){
  // Brake only when the requested throttle opposes signed longitudinal motion.
  // Absolute speed incorrectly treated reversing as forward and ignored lateral drift.
  const signedSpeed=Number(drivingCar.groundVehicleMotion?.signedSpeed)||0;
  const brake=Number(inputThrottle!==0&&signedSpeed*inputThrottle< -1);
  drivingCar.groundVehicleInput={throttle,steer,brake,handbrake:Number(handbrake)};
  tickVehicleSystems(drivingCar,step,{speed:driving3d.speed,throttle});
  // Entity speed is updated by the physics backend; use the measured horizontal
  // Rigidbody velocity for HUD / brake intent (scene units per second).
  const rb=drivingCar.rigidbody3d;
  if(rb)driving3d.speed=Math.hypot(Number(rb.vx)||0,Number(rb.vz)||0);
  player.x=drivingCar.x+((drivingCar.w||32)-(player.w||32))/2;
  player.y=drivingCar.y+((drivingCar.depth3d||drivingCar.h||32)-(player.depth3d||player.h||32))/2;
  player.elevation3d=drivingCar.elevation3d||0;
  player._hiddenInVehicle=true;player.animation='drive';
  // Animation follows longitudinal signed speed, not total horizontal speed:
  // slipping sideways must not look like forward acceleration, or hide reverse.
  drivingCar.animation=handbrake&&driving3d.speed>2?'brake':Math.abs(signedSpeed)<=2?'idle':signedSpeed<0?'reverse':'drive';
  return true;
 }
 const state=stepArcadeVehicle({speed:driving3d.speed,steer:driving3d.steer,rotation:drivingCar.rotation||0},
  {throttle,steer,handbrake},step,vehicleTuning(drivingCar));
 driving3d.speed=state.speed;driving3d.steer=state.steer;
 const backend=collisionBackend3d(),oldRotation=drivingCar.rotation||0;
 if(backend?.owns(drivingCar)){
  // Test intermediate orientations too: rotating a long vehicle must not
  // sweep its nose through a thin wall between two accepted poses.
  const steps=Math.max(1,Math.ceil(Math.abs(state.rotation-oldRotation)/3));
  for(let i=1;i<=steps;i++){
   const rotation=oldRotation+(state.rotation-oldRotation)*i/steps;
   if(!backend.canPlace(drivingCar,{rotation},{ignore:player}))break;
   drivingCar.rotation=rotation;
  }
 }else drivingCar.rotation=state.rotation;
 tickVehicleSystems(drivingCar,step,{speed:state.speed,throttle});
 const startX=drivingCar.x,startY=drivingCar.y;
 const heading=(drivingCar.rotation||0)*Math.PI/180;
 state.dx=Math.sin(heading)*state.speed*step;state.dy=-Math.cos(heading)*state.speed*step;
 const contacts=moveBody3d(drivingCar,state.dx,state.dy,0,entities,{ignore:player});
 const move={collision:contacts.blockedX||contacts.blockedY};
 const articulated=vehicleConfiguration(drivingCar);
 if(articulated?.enabled){
  const pressed=keys.has('o')&&!drivingCar._doorKeyHeld;
  tickVehicleArticulation(drivingCar,step,{speed:step>0?Math.sign(state.speed)*Math.hypot(drivingCar.x-startX,drivingCar.y-startY)/step:0,steer:state.steer,doorToggle:pressed,
   turretYaw:Number(keys.has('l'))-Number(keys.has('j')),
   barrelPitch:Number(keys.has('i'))-Number(keys.has('k'))});
  drivingCar._doorKeyHeld=keys.has('o');
 }
 if(move.collision){recordEngineEvent('collision',drivingCar.name);impactVehicle(drivingCar,driving3d.speed);driving3d.speed=-driving3d.speed*.12;driving3d.impact=.25}
 player.x=drivingCar.x+((drivingCar.w||32)-(player.w||32))/2;
 player.y=drivingCar.y+((drivingCar.depth3d||drivingCar.h||32)-(player.depth3d||player.h||32))/2;
 player.elevation3d=drivingCar.elevation3d||0;player._hiddenInVehicle=true;player.animation='drive';
 drivingCar.animation=Math.abs(driving3d.speed)<2?'idle':handbrake?'brake':driving3d.speed<0?'reverse':'drive';
 return true;
}
