// Aircraft V7: independent Rapier raycast wheel/suspension contacts.
// The V6 gear switch retracts the wheels; Rapier owns body motion and collisions.
import {defaultWheelPhysics,validateWheelPhysics,solveWheelForces} from './vehicle-wheel-physics.js';
import {rotateAircraftVector} from './aircraft-rapier.js';
const finite=(v,d=0)=>typeof v==='number'&&Number.isFinite(v)?v:d;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,finite(v)));
const add=(a,b)=>({x:a.x+b.x,y:a.y+b.y,z:a.z+b.z});
const scale=(v,k)=>({x:v.x*k,y:v.y*k,z:v.z*k});
const mounts=kind=>(kind==='helicopter'?[
 {position:{x:-.8,y:-.5,z:-1.1},braking:true},
 {position:{x:.8,y:-.5,z:-1.1},braking:true},
 {position:{x:0,y:-.5,z:1.2},braking:false}
]:[
 {position:{x:-1.05,y:-.5,z:-.5},braking:true},
 {position:{x:1.05,y:-.5,z:-.5},braking:true},
 {position:{x:0,y:-.5,z:2},braking:false}
]).map(m=>({...m,wheel:{...defaultWheelPhysics(),radius:.38,restLength:.3,travel:.22,
 spring:kind==='helicopter'?65000:54000,damper:8000,driven:false,braking:m.braking}}));
export const defaultAircraftLandingGear=(kind='airplane')=>({
 enabled:true,kind,brakeForce:kind==='helicopter'?12000:17000,wheels:mounts(kind)
});
export function validateAircraftLandingGear(config){
 if(!config||!['airplane','helicopter'].includes(config.kind))return ['Aircraft landing gear: invalid type'];
 const errors=[];
 if(!Number.isFinite(config.brakeForce)||config.brakeForce<0)errors.push('Aircraft landing gear: invalid brake force');
 if(!Array.isArray(config.wheels)||config.wheels.length<3||config.wheels.length>12)errors.push('Aircraft landing gear: invalid wheel mounts');
 else for(const mount of config.wheels){
  if(!mount?.position||!['x','y','z'].every(k=>Number.isFinite(mount.position[k]))||
   validateWheelPhysics(mount.wheel).length)errors.push('Aircraft landing gear: invalid wheel or suspension geometry');
 }
 return errors;
}
export function applyAircraftLandingGearForces(scene,dt){
 if(!scene?.api?.Ray||!scene?.world?.castRayAndGetNormal||!(dt>0&&Number.isFinite(dt)))return [];
 const results=[];
 for(const actor of scene.actors.values()){
  const e=actor.entity,gear=e?.aircraftLandingGear;
  if(!gear?.enabled||!e?.aircraftPhysics?.enabled)continue;
  if(e.aircraftSystems?.enabled&&e.aircraftSystems.gear?.deployed===false){
   results.push({id:e.id,contacts:0,retracted:true});continue;
  }
  const errors=validateAircraftLandingGear(gear);
  if(gear.kind!==e.aircraftPhysics.kind)errors.push('Aircraft landing gear: mismatched airframe type');
  if(!actor.isDynamic||typeof actor.body?.applyImpulseAtPoint!=='function'||e.rigidbody3d?.lockRotations!==false)
   errors.push('Aircraft landing gear: dynamic unlocked Rapier body required');
  if(errors.length){results.push({id:e.id,error:errors.join('; ')});continue}
  const body=actor.body,q=body.rotation(),center=body.translation(),up=rotateAircraftVector(q,{x:0,y:1,z:0}),
   forward=rotateAircraftVector(q,{x:0,y:0,z:-1}),right=rotateAircraftVector(q,{x:1,y:0,z:0});
  const down=scale(up,-1),velocity=body.linvel(),angularVelocity=body.angvel();
  const brake=clamp(e.aircraftGearInput?.brake??0,0,1);
  const brakeWheels=gear.wheels.filter(m=>m.braking).length||1;
  let contacts=0;
  for(const mount of gear.wheels){
   const origin=add(center,rotateAircraftVector(q,mount.position));
   const travel=mount.wheel.radius+mount.wheel.restLength+mount.wheel.travel;
   const hit=scene.world.castRayAndGetNormal(new scene.api.Ray(origin,down),travel,true,
    scene.api.QueryFilterFlags?.EXCLUDE_SENSORS,undefined,undefined,body);
   const distance=hit?.timeOfImpact;
   if(!Number.isFinite(distance)||distance>travel||!hit.normal)continue;
   const point=add(origin,scale(down,distance));
   const solved=solveWheelForces({
    wheel:mount.wheel,contact:{distance,normal:hit.normal,point},dt,
    inputs:{brake,handbrake:0,throttle:0,steer:0},
    state:{velocity,angularVelocity,forward,right,up,centerOfMass:center},
    driveForce:0,brakeForce:gear.brakeForce/brakeWheels
   });
   if(!solved.grounded)continue;
   actor.body.applyImpulseAtPoint(scale(solved.force,dt),point,true);
   contacts++;
  }
  results.push({id:e.id,contacts,grounded:contacts>0});
 }
 return results;
}
