// Opt-in terrestrial vehicle chassis dynamics for Rapier 3D (Y-up, SI units).
// Existing arcade vehicles stay unchanged unless groundVehiclePhysics.enabled=true.
// Forces are applied as timestep impulses, avoiding persistent Rapier force accumulation.
import {defaultWheelPhysics,validateWheelPhysics,solveWheelForces} from './vehicle-wheel-physics.js';
const finite=(v,d=0)=>typeof v==='number'&&Number.isFinite(v)?v:d;
const clamp=(v,a,b)=>Math.min(b,Math.max(a,finite(v)));
const add=(a,b)=>({x:a.x+b.x,y:a.y+b.y,z:a.z+b.z});
const scale=(a,k)=>({x:a.x*k,y:a.y*k,z:a.z*k});
const cross=(a,b)=>({x:a.y*b.z-a.z*b.y,y:a.z*b.x-a.x*b.z,z:a.x*b.y-a.y*b.x});
const rotate=(q,v)=>{
 const qv={x:q.x,y:q.y,z:q.z}, t=scale(cross(qv,v),2);
 return add(v,add(scale(t,q.w),cross(qv,t)));
};
const gridWheels=(axles,halfWidth,frontSteer,tracked)=>axles.flatMap((z,i)=>[-1,1].map(side=>({
 position:{x:side*halfWidth,y:0,z},wheel:{
  ...defaultWheelPhysics(),steering:frontSteer&&i===0,driven:tracked||i===axles.length-1,
  spring:tracked?95000:axles.length===3?52000:32000,
  damper:tracked?11500:axles.length===3?6000:4300,
  grip:tracked?1.2:1.05
 },side
})));
export const GROUND_VEHICLE_KINDS=Object.freeze(['car','truck','tracked']);
export function defaultGroundVehiclePhysics(kind='car'){
 if(kind==='truck')return {enabled:true,kind,mass:8500,driveForce:32000,brakeForce:60000,wheels:gridWheels([-2.15,0,2.15],1.0,true,false)};
 if(kind==='tracked')return {enabled:true,kind,mass:32000,driveForce:125000,brakeForce:170000,wheels:gridWheels([-2.5,-1.5,-.5,.5,1.5,2.5],1.5,false,true)};
 if(kind!=='car')throw Error('Ground vehicle: unknown type');
 return {enabled:true,kind,mass:1450,driveForce:8200,brakeForce:14000,wheels:gridWheels([-1.35,1.35],.82,true,false)};
}
export function validateGroundVehiclePhysics(config){
 const errors=[];
 if(!config||!GROUND_VEHICLE_KINDS.includes(config.kind))return ['Ground vehicle: invalid type'];
 if(!Number.isFinite(config.mass)||config.mass<=0)errors.push('Ground vehicle: invalid mass');
 for(const key of ['driveForce','brakeForce'])if(!Number.isFinite(config[key])||config[key]<0)errors.push('Ground vehicle: invalid '+key);
 if(!Array.isArray(config.wheels)||config.wheels.length<2||config.wheels.length>24)errors.push('Ground vehicle: invalid wheel count');
 else for(const wheel of config.wheels){
  if(!wheel?.position||!['x','y','z'].every(k=>Number.isFinite(wheel.position[k]))||!wheel.wheel)errors.push('Ground vehicle: invalid wheel mount');
  else if(validateWheelPhysics(wheel.wheel).length)errors.push('Ground vehicle: invalid wheel configuration');
 }
 return errors;
}
// Signed forward velocity in scene units/s, measured from the physical chassis.
// Positive = forward, negative = reverse; lateral drift does not count as reverse.
export function signedGroundVehicleSpeed(body){
 if(!body?.rotation||!body?.linvel)return 0;
 const forward=rotate(body.rotation(),{x:0,y:0,z:-1}),v=body.linvel();
 return (finite(v.x)*forward.x+finite(v.y)*forward.y+finite(v.z)*forward.z)*64;
}
export const groundVehicleInputs=(input={})=>({
 throttle:clamp(input.throttle,-1,1),steer:clamp(input.steer,-1,1),
 brake:clamp(input.brake,0,1),handbrake:clamp(input.handbrake,0,1)
});
export function wheelDriveInput(config,wheel,input){
 // Differential steering on tracked vehicles: left and right tracks receive
 // opposing drive commands; true pivot turns work with zero throttle.
 if(config.kind==='tracked')return clamp(input.throttle+(wheel.side<0?input.steer:-input.steer),-1,1);
 return input.throttle;
}
/**
 * Called once per Rapier fixed step before world.step().
 * Accepts an injectable scene to permit deterministic adapter tests.
 * The vehicle chassis must have rigidbody3d.enabled and lockRotations:false.
 * Typical authored mass should match rigidbody3d.mass (physics mass).
 */
export function applyGroundVehicleForces(scene,dt){
 if(!scene?.api?.Ray||!scene?.world?.castRayAndGetNormal||!(dt>0&&Number.isFinite(dt)))return [];
 const outputs=[];
 for(const actor of scene.actors.values()){
  const entity=actor.entity,config=entity?.groundVehiclePhysics;
  if(!config?.enabled||!actor.isDynamic)continue;
  const errors=validateGroundVehiclePhysics(config);
  if(errors.length){outputs.push({id:entity.id,error:errors.join('; ')});continue;}
  const body=actor.body;
  if(typeof body.applyImpulseAtPoint!=='function'||entity.rigidbody3d?.lockRotations!==false){
   outputs.push({id:entity.id,error:'Dynamic Rigidbody3D with lockRotations:false required'});continue;
  }
  const q=body.rotation(),center=body.translation(),forward=rotate(q,{x:0,y:0,z:-1});
  const right=rotate(q,{x:1,y:0,z:0}),up=rotate(q,{x:0,y:1,z:0});
  const velocity=body.linvel(),angularVelocity=body.angvel();
  const inputs=groundVehicleInputs(entity.groundVehicleInput);
  const driven=config.wheels.filter(w=>w.wheel.driven).length||1;
  const braking=config.wheels.filter(w=>w.wheel.braking).length||1;
  let contacts=0;
  for(const mount of config.wheels){
   const origin=add(center,rotate(q,mount.position));
   const travel=mount.wheel.radius+mount.wheel.restLength+mount.wheel.travel;
   const down=scale(up,-1),ray=new scene.api.Ray(origin,down);
   // Ignore this rigid body and sensors, including its own wheel/chassis colliders.
   const hit=scene.world.castRayAndGetNormal(ray,travel,true,scene.api.QueryFilterFlags?.EXCLUDE_SENSORS,undefined,undefined,body);
   const distance=finite(hit?.timeOfImpact,Infinity);
   if(!hit||!Number.isFinite(distance)||distance>travel)continue;
   const point=add(origin,scale(down,distance));
   const normal=hit.normal;
   if(!normal||!['x','y','z'].every(k=>Number.isFinite(normal[k])))continue;
   const contact={distance,normal,point};
   const drive=wheelDriveInput(config,mount,inputs);
   const solved=solveWheelForces({
    wheel:mount.wheel,contact,dt,
    inputs:{...inputs,throttle:drive,steer:config.kind==='tracked'?0:inputs.steer},
    state:{velocity,angularVelocity,forward,right,up,centerOfMass:center},
    driveForce:config.driveForce/driven,brakeForce:config.brakeForce/braking,
    // A tire can cancel at most its share of the chassis' lateral momentum
    // per step. Rapier's friction circle still limits available grip.
    effectiveMass:config.mass/config.wheels.length
   });
   if(!solved.grounded)continue;
   contacts++;
   body.applyImpulseAtPoint(scale(solved.force,dt),point,true);
  }
  outputs.push({id:entity.id,contacts,grounded:contacts>0});
 }
 return outputs;
}
