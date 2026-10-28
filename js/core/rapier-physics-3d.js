// Optional high-quality third-party 3D rigidbody engine.
// Rapier (Apache-2.0) is loaded as an external module, not copied into WarLike.
// Loading must be explicitly initiated; WarLike's own physics remains the fallback.
import {solidBody3d} from './collision-3d.js';
let rapier=null,initPromise=null,loadError=null;
export const rapierStatus=()=>({ready:!!rapier,error:loadError});
export async function loadRapier3d(){
 if(rapier)return rapier;
 if(initPromise)return initPromise;
 initPromise=(async()=>{
  try{
   const module=await import('@dimforge/rapier3d-compat');
   const api=module.default||module;
   await api.init();
   rapier=api;loadError=null;return api;
  }catch(error){loadError=String(error?.message||error);return null}
  finally{initPromise=null}
 })();
 return initPromise;
}
/** Independent Rapier simulation; local scene coordinates use 64 px per meter. */
export function createRapierScene(RAPIER,entities,gravity=15){
 if(!RAPIER?.World)throw Error('Rapier 3D not initialized');
 const world=new RAPIER.World({x:0,y:-Math.max(0,gravity),z:0});
 const actors=new Map();
 // Keep the same implicit floor as the built-in runtime.
 const floor=world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(0,-.5,0));
 world.createCollider(RAPIER.ColliderDesc.cuboid(20000,.5,20000),floor);
 const toMeters=v=>Number(v||0)/64;
 for(const o of entities){
  if(!solidBody3d(o))continue;
  const isDynamic=!!o.rigidbody3d?.enabled&&!o.rigidbody3d.kinematic&&!o.playable3d&&!o.ai?.enabled&&o.type!=='player';
  const width=Math.max(.01,toMeters(o.w||32)),depth=Math.max(.01,toMeters(o.depth3d||o.h||32)),height=Math.max(.01,toMeters(o.h||32));
  const pos={x:toMeters(o.x||0)+width/2,y:Number(o.elevation3d||0)+height/2,z:toMeters(o.y||0)+depth/2};
  const desc=(isDynamic?RAPIER.RigidBodyDesc.dynamic():RAPIER.RigidBodyDesc.fixed()).setTranslation(pos.x,pos.y,pos.z);
  if(isDynamic){desc.setLinvel(Number(o.rigidbody3d.vx||0)/64,Number(o.rigidbody3d.vy||0),Number(o.rigidbody3d.vz||0)/64);desc.setCcdEnabled?.(true);desc.setGravityScale?.(Math.max(0,Number(o.rigidbody3d.gravity??15))/Math.max(.001,gravity));desc.lockRotations?.()}
  const body=world.createRigidBody(desc);
  const collider=RAPIER.ColliderDesc.cuboid(width/2,height/2,depth/2);
  if(isDynamic){
   collider.setRestitution(Math.max(0,Math.min(1,Number(o.rigidbody3d.restitution??.2))));
   collider.setFriction(Math.max(0,Math.min(1,Number(o.rigidbody3d.friction??.82))));
   collider.setMass?.(Math.max(.01,Number(o.rigidbody3d.mass)||1));
  }
  world.createCollider(collider,body);
  actors.set(o.id,{body,entity:o,width,depth,height,isDynamic,config:bodyConfig(o),lastPosition:scenePosition(o),lastVelocity:{x:Number(o.rigidbody3d?.vx||0),y:Number(o.rigidbody3d?.vy||0),z:Number(o.rigidbody3d?.vz||0)}});
 }
 return {world,actors,api:RAPIER,entityCount:entities.length};
}
/** Sync external edits and impulses from gameplay components to Rapier before stepping. */
export function synchronizeRapierScene(scene,entities){
 const current=new Map(entities.map(o=>[o.id,o]));
 // Topology or dimensions changed: caller should rebuild the Rapier world.
 if(current.size!==scene.entityCount && scene.entityCount!==undefined)return false;
 if(entities.filter(solidBody3d).length!==scene.actors.size)return false;
 for(const [id,record] of scene.actors){
  const o=current.get(id);
  if(!o||o!==record.entity||!solidBody3d(o)||bodyConfig(o)!==record.config)return false;
  const {body,width,depth,height,isDynamic,lastVelocity}=record;
  if(Math.abs(Math.max(.01,Number(o.w||32)/64)-width)>1e-5||
     Math.abs(Math.max(.01,Number(o.depth3d||o.h||32)/64)-depth)>1e-5||
     Math.abs(Math.max(.01,Number(o.h||32)/64)-height)>1e-5)return false;
  const px=Number(o.x||0)/64+width/2,pz=Number(o.y||0)/64+depth/2,py=Number(o.elevation3d||0)+height/2;
  if(!isDynamic){
   const p=body.translation();
   if(Math.abs(p.x-px)+Math.abs(p.y-py)+Math.abs(p.z-pz)>1e-5)body.setTranslation({x:px,y:py,z:pz},true);
  }else if(o.rigidbody3d){
   const previous=record.lastPosition;
   if(Math.abs(o.x-previous.x)+Math.abs(o.y-previous.y)+Math.abs((o.elevation3d||0)-previous.z)>1e-5)body.setTranslation({x:px,y:py,z:pz},true);
   const rb=o.rigidbody3d;
   const proposed={x:Number(rb.vx||0),y:Number(rb.vy||0),z:Number(rb.vz||0)};
   if(Math.abs(proposed.x-lastVelocity.x)+Math.abs(proposed.y-lastVelocity.y)+Math.abs(proposed.z-lastVelocity.z)>1e-5){
    body.setLinvel({x:proposed.x/64,y:proposed.y,z:proposed.z/64},true);
   }
  }
  record.lastPosition=scenePosition(o);
 }
 return true;
}
export function stepRapierScene(scene,dt){
 const t=Math.min(.05,Math.max(0,Number(dt)||0));if(!t)return;
 scene.world.timestep=t;
 scene.world.step();
 for(const record of scene.actors.values()){
  const {body,entity,width,depth,height,isDynamic}=record;
  if(!isDynamic)continue;
  const p=body.translation(),v=body.linvel();
  entity.x=(p.x-width/2)*64;
  entity.y=(p.z-depth/2)*64;
  entity.elevation3d=Math.max(0,p.y-height/2);
  if(entity.rigidbody3d){
   entity.rigidbody3d.vx=v.x*64;
   entity.rigidbody3d.vz=v.z*64;
   entity.rigidbody3d.vy=v.y;
   record.lastVelocity={x:v.x*64,y:v.y,z:v.z*64};
  }
  record.lastPosition=scenePosition(entity);
 }
}
export function disposeRapierScene(scene){scene?.world?.free?.();scene?.actors?.clear?.()}
const scenePosition=o=>({x:Number(o.x)||0,y:Number(o.y)||0,z:Number(o.elevation3d)||0});
const bodyConfig=o=>JSON.stringify([!!o.rigidbody3d?.enabled,!!o.rigidbody3d?.kinematic,!!o.playable3d,!!o.ai?.enabled,o.rigidbody3d?.mass??1,o.rigidbody3d?.gravity??15,o.rigidbody3d?.friction??.82,o.rigidbody3d?.restitution??.2]);
