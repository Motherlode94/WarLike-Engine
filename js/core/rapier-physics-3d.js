// Optional high-quality third-party 3D rigidbody engine.
// Rapier (Apache-2.0) is loaded as an external module, not copied into WarLike.
// Loading must be explicitly initiated; WarLike's own physics remains the fallback.
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
 const toMeters=v=>Number(v||0)/64;
 for(const o of entities){
  if(o.collision3d===false||!(o.solid3d===true||o.type==='mesh3d'||o.rigidbody3d?.enabled))continue;
  const isDynamic=!!o.rigidbody3d?.enabled&&!o.rigidbody3d.kinematic&&!o.playable3d&&!o.ai?.enabled&&o.type!=='player';
  const width=Math.max(.01,toMeters(o.w||32)),depth=Math.max(.01,toMeters(o.depth3d||o.h||32)),height=Math.max(.01,toMeters(o.h||32));
  const pos={x:toMeters(o.x||0)+width/2,y:Number(o.elevation3d||0)+height/2,z:toMeters(o.y||0)+depth/2};
  const desc=(isDynamic?RAPIER.RigidBodyDesc.dynamic():RAPIER.RigidBodyDesc.fixed()).setTranslation(pos.x,pos.y,pos.z);
  const body=world.createRigidBody(desc);
  const collider=RAPIER.ColliderDesc.cuboid(width/2,height/2,depth/2);
  if(isDynamic){
   collider.setRestitution(Math.max(0,Math.min(1,Number(o.rigidbody3d.restitution??.2))));
   collider.setFriction(Math.max(0,Math.min(1,Number(o.rigidbody3d.friction??.82))));
  }
  world.createCollider(collider,body);
  actors.set(o.id,{body,entity:o,width,depth,height,isDynamic});
 }
 return {world,actors};
}
export function stepRapierScene(scene,dt){
 const t=Math.min(.05,Math.max(0,Number(dt)||0));if(!t)return;
 scene.world.timestep=t;
 scene.world.step();
 for(const {body,entity,width,depth,height,isDynamic} of scene.actors.values()){
  if(!isDynamic)continue;
  const p=body.translation(),v=body.linvel();
  entity.x=(p.x-width/2)*64;
  entity.y=(p.z-depth/2)*64;
  entity.elevation3d=Math.max(0,p.y-height/2);
  if(entity.rigidbody3d){
   entity.rigidbody3d.vx=v.x*64;
   entity.rigidbody3d.vz=v.z*64;
   entity.rigidbody3d.vy=v.y;
  }
 }
}
export function disposeRapierScene(scene){scene?.world?.free?.();scene?.actors?.clear?.()}
