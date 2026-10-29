import {solidBody3d,moveBody3d} from './collision-3d.js';
import {vehicleComponents,canDriveVehicle,tickVehicleSystems,impactVehicle} from './vehicle-components.js';
import {fireVehicleWeapon,tickVehicleWeapon,vehicleWeaponConfig} from './vehicle-weapons-3d.js';
import {recordEngineEvent} from './engine-diagnostics.js';
import {stepArcadeVehicle} from './arcade-driving.js';
import {get3dAsset} from '../assets/catalog-3d.js';
const center=o=>({x:o.x+(o.w||32)/2,y:o.y+(o.depth3d||o.h||32)/2});
export const isDriveable3d=o=>!!o&&(o.vehicleConfig?.driveable===true||o.tags?.includes('race-vehicle')||get3dAsset(o.assetId||o.model3dId)?.category==='Vehicles');
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
export function updateDriving3d(entities,player,keys,dt){
 const step=Math.min(.1,Math.max(0,Number(dt)||0));
 driving3d.impact=Math.max(0,driving3d.impact-step);
 const enter=keys.has('e');
 const car=currentVehicle3d(entities);
 if(enter&&!driving3d.enterHeld){
  if(car){
   const width=Math.max(1,player.w||32),depth=Math.max(1,player.depth3d||player.h||32);
   const exits=[
    {x:car.x-width-12,y:car.y+((car.depth3d||car.h||32)-depth)/2},
    {x:car.x+(car.w||32)+12,y:car.y+((car.depth3d||car.h||32)-depth)/2}
   ];
   const free=exits.find(pos=>!entities.some(o=>solid(o,car,player)&&intersects({...player,depth3d:depth},pos.x,pos.y,o)));
   if(free){player._vehicleInputConsumed=true;recordEngineEvent('vehicle-exit',car.name);player.x=free.x;player.y=free.y;player.elevation3d=car.elevation3d||0;player._hiddenInVehicle=false;player.animation='idle';vehicleComponents(car).seats.driverId=null;resetDriving3d()}
  }else if(player){
   const p=center(player);
   const candidates=entities.filter(o=>o!==player&&isDriveable3d(o)&&o.sequenceEnabled!==false&&!o._sequenceDestroyed).map(o=>({o,d:Math.hypot(center(o).x-p.x,center(o).y-p.y)})).sort((a,b)=>a.d-b.d);
   const nearest=candidates[0];
   if(nearest&&Math.abs((Number(nearest.o.elevation3d)||0)-(Number(player.elevation3d)||0))<1.8&&nearest.d<Math.max(150,(nearest.o.w||64)*.85)&&canDriveVehicle(nearest.o)){
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
 const state=stepArcadeVehicle({speed:driving3d.speed,steer:driving3d.steer,rotation:drivingCar.rotation||0},
  {throttle,steer,handbrake},step,drivingCar);
 driving3d.speed=state.speed;driving3d.steer=state.steer;drivingCar.rotation=state.rotation;
 tickVehicleSystems(drivingCar,step,{speed:state.speed,throttle});
 const contacts=moveBody3d(drivingCar,state.dx,state.dy,0,entities,{ignore:player});
 const move={collision:contacts.blockedX||contacts.blockedY};
 if(move.collision){recordEngineEvent('collision',drivingCar.name);impactVehicle(drivingCar,driving3d.speed);driving3d.speed=-driving3d.speed*.12;driving3d.impact=.25}
 player.x=drivingCar.x+((drivingCar.w||32)-(player.w||32))/2;
 player.y=drivingCar.y+((drivingCar.depth3d||drivingCar.h||32)-(player.depth3d||player.h||32))/2;
 player.elevation3d=drivingCar.elevation3d||0;player._hiddenInVehicle=true;player.animation='drive';
 drivingCar.animation=Math.abs(driving3d.speed)<2?'idle':handbrake?'brake':driving3d.speed<0?'reverse':'drive';
 return true;
}
