// Opt-in real-Rapier aircraft dynamics, Y-up and SI units.
// The same fixed-step adapter is used by editor Play and exported player.
import {solveAircraftForces,validateAircraftConfig} from './aircraft-flight-physics.js';
const zero=()=>({x:0,y:0,z:0});
const finite=(value,defaultValue=0)=>typeof value==='number'&&Number.isFinite(value)?value:defaultValue;
const clamp=(value,min,max)=>Math.min(max,Math.max(min,finite(value)));
const add=(a,b)=>({x:a.x+b.x,y:a.y+b.y,z:a.z+b.z});
const scale=(a,k)=>({x:a.x*k,y:a.y*k,z:a.z*k});
const cross=(a,b)=>({x:a.y*b.z-a.z*b.y,y:a.z*b.x-a.x*b.z,z:a.x*b.y-a.y*b.x});
export const rotateAircraftVector=(q,v)=>{
 const u={x:q.x,y:q.y,z:q.z};
 const t=scale(cross(u,v),2);
 return add(v,add(scale(t,q.w),cross(u,t)));
};
export const aircraftControls=(input={})=>({
 throttle:clamp(input.throttle,0,1),
 collective:clamp(input.collective,0,1),
 pitch:clamp(input.pitch,-1,1),
 roll:clamp(input.roll,-1,1),
 yaw:clamp(input.yaw,-1,1)
});
export function validateAircraftActor(entity){
 const errors=validateAircraftConfig(entity?.aircraftPhysics);
 if(errors.length)return errors;
 const rb=entity?.rigidbody3d;
 if(!rb?.enabled||rb.kinematic||rb.lockRotations!==false)errors.push('Aircraft: Rigidbody3D dynamique avec rotations libres requis');
 if(!entity?.collider3d||entity.collider3d.enabled===false||entity.collision3d===false)errors.push('Aircraft: Collider3D actif requis');
 if(entity.groundVehiclePhysics?.enabled)errors.push('Aircraft: ne pas activer simultanément la physique terrestre');
 if(Number.isFinite(rb?.mass)&&Math.abs(rb.mass-entity.aircraftPhysics.mass)>.01)errors.push('Aircraft: masse du Rigidbody différente de celle de la cellule');
 return errors;
}
export function applyAircraftForces(scene,dt){
 if(!scene?.actors||!(dt>0&&Number.isFinite(dt)))return [];
 const results=[];
 for(const actor of scene.actors.values()){
  const e=actor.entity,config=e?.aircraftPhysics;
  if(!config?.enabled)continue;
  const errors=validateAircraftActor(e);
  if(errors.length){results.push({id:e.id,error:errors.join('; ')});continue}
  if(!actor.isDynamic||typeof actor.body?.applyImpulse!=='function'||typeof actor.body?.applyTorqueImpulse!=='function'){
   results.push({id:e.id,error:'Aircraft: corps dynamique Rapier et API impulses requis'});continue;
  }
  const q=actor.body.rotation();
  const forward=rotateAircraftVector(q,{x:0,y:0,z:-1});
  const up=rotateAircraftVector(q,{x:0,y:1,z:0});
  const right=rotateAircraftVector(q,{x:1,y:0,z:0});
  try{
   const solved=solveAircraftForces({
    config,velocity:actor.body.linvel(),angularVelocity:actor.body.angvel(),
    wind:e.aircraftWind||zero(),forward,up,right,
    controls:aircraftControls(e.aircraftInput),includeGravity:false
   });
   // Rapier owns gravity and collision resolution. Convert continuous N and Nm
   // to fixed-step impulses so no force persists beyond this step.
   actor.body.applyImpulse(scale(solved.force,dt),true);
   actor.body.applyTorqueImpulse(scale(solved.torque,dt),true);
   results.push({id:e.id,kind:config.kind,airSpeed:solved.airSpeed,lift:solved.lift,stalled:solved.stalled,thrust:solved.thrust});
  }catch(error){results.push({id:e.id,error:'Aircraft: '+String(error?.message||error)})}
 }
 return results;
}
