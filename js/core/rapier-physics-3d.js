import {solidBody3d,activeBody3d} from './collision-3d.js';
import {characterBody3d,colliderGeometry3d,colliderPosition3d,rotationQuaternion3d,quaternionEuler3d} from './collider-3d.js';
let activeScene=null;
export const activeRapierScene3d=()=>activeScene;
let rapier=null,initPromise=null,loadError=null;
export const rapierStatus=()=>({ready:!!rapier,error:loadError});
export async function loadRapier3d(){
 if(rapier)return rapier;if(initPromise)return initPromise;
 initPromise=(async()=>{try{const module=await import('@dimforge/rapier3d-compat');const api=module.default||module;await api.init();rapier=api;loadError=null;return api}catch(error){loadError=String(error?.message||error);return null}finally{initPromise=null}})();return initPromise;
}
const n=(v,d=0)=>Number.isFinite(Number(v))?Number(v):d;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,n(v)));
const included=o=>activeBody3d(o)&&o.collision3d!==false&&(solidBody3d(o)||characterBody3d(o));
const dynamic=o=>!!o.rigidbody3d?.enabled&&!o.rigidbody3d.kinematic&&!characterBody3d(o)&&!o.ai?.enabled;
const bodyConfig=o=>JSON.stringify([dynamic(o),characterBody3d(o),o.rigidbody3d,o.collider3d,o.controller3d,o.joint3d].map((v,i)=>i===2&&v?Object.fromEntries(Object.entries(v).filter(([k])=>!['vx','vy','vz'].includes(k))):v));
const scenePosition=o=>({x:n(o.x),y:n(o.y),z:n(o.elevation3d)});
const velocity=o=>({x:n(o.rigidbody3d?.vx),y:n(o.rigidbody3d?.vy),z:n(o.rigidbody3d?.vz)});
const changed=(a,b)=>Object.keys(a).some(k=>Math.abs(a[k]-n(b?.[k]))>1e-5);
function controllerFor(world,o){
 if(!world.createCharacterController)return null;
 const c=o.controller3d||{},controller=world.createCharacterController(clamp(c.skinWidth??.01,.001,.1));
 controller.setMaxSlopeClimbAngle(clamp(c.slopeLimit??45,0,85)*Math.PI/180);controller.setMinSlopeSlideAngle(clamp(c.slideAngle??50,0,89)*Math.PI/180);
 controller.setSlideEnabled(true);if(n(c.stepHeight,.28)>0)controller.enableAutostep(clamp(c.stepHeight??.28,0,.6),clamp(c.stepMinWidth??.12,.01,1),false);
 if(n(c.snapToGround,.2)>0)controller.enableSnapToGround(clamp(c.snapToGround??.2,0,1));
 controller.setApplyImpulsesToDynamicBodies(c.pushBodies!==false);controller.setCharacterMass(Math.max(.1,n(c.mass,70)));return controller;
}
export function createRapierScene(RAPIER,entities,gravity=15){
 if(!RAPIER?.World)throw Error('Rapier 3D not initialized');
 const world=new RAPIER.World({x:0,y:-Math.max(0,gravity),z:0}),actors=new Map(),joints=new Map(),errors=[];
 const floor=world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(0,-.5,0));world.createCollider(RAPIER.ColliderDesc.cuboid(20000,.5,20000),floor);
 for(const o of entities){
  if(!included(o))continue;
  const g=colliderGeometry3d(o),pos=colliderPosition3d(o,g),isCharacter=characterBody3d(o),isDynamic=dynamic(o),isKinematic=isCharacter||o.rigidbody3d?.kinematic===true;
  const desc=(isDynamic?RAPIER.RigidBodyDesc.dynamic():isKinematic&&RAPIER.RigidBodyDesc.kinematicPositionBased?RAPIER.RigidBodyDesc.kinematicPositionBased():RAPIER.RigidBodyDesc.fixed()).setTranslation(pos.x,pos.y,pos.z);
  const rotation=rotationQuaternion3d(o);desc.setRotation?.(rotation);
  if(isDynamic){const v=velocity(o);desc.setLinvel(v.x/64,v.y,v.z/64);desc.setCcdEnabled?.(o.rigidbody3d.ccd!==false);desc.setGravityScale?.(Math.max(0,n(o.rigidbody3d.gravity,15))/Math.max(.001,gravity));if(o.rigidbody3d.lockRotations!==false)desc.lockRotations?.()}
  const body=world.createRigidBody(desc);
  const colliderDesc=g.shape==='capsule'?RAPIER.ColliderDesc.capsule(g.halfHeight,g.radius):g.shape==='sphere'?RAPIER.ColliderDesc.ball(g.radius):RAPIER.ColliderDesc.cuboid(g.w/2,g.h/2,g.d/2);
  colliderDesc.setTranslation?.(g.offset.x,g.offset.y,g.offset.z);colliderDesc.setRestitution?.(clamp(o.rigidbody3d?.restitution??.2,0,1));colliderDesc.setFriction?.(clamp(o.rigidbody3d?.friction??.82,0,2));if(isDynamic)colliderDesc.setMass?.(Math.max(.01,n(o.rigidbody3d.mass,1)));
  const collider=world.createCollider(colliderDesc,body),controller=isCharacter?controllerFor(world,o):null;
  actors.set(o.id,{body,collider,controller,entity:o,geometry:g,width:n(o.w,32)/64,depth:n(o.depth3d,o.h||32)/64,height:n(o.h,32)/64,isDynamic,isKinematic,isCharacter,config:bodyConfig(o),lastPosition:scenePosition(o),lastVelocity:velocity(o),lastRotation:rotation});
 }
 for(const o of entities){const j=o.joint3d;if(!j||j.enabled===false)continue;const a=actors.get(o.id),b=actors.get(Number(j.targetId));if(!a||!b||a===b){errors.push(o.name+' : cible d’articulation invalide.');continue}
  try{
   const anchor={x:n(j.anchorX),y:n(j.anchorY),z:n(j.anchorZ)},target={x:n(j.targetAnchorX),y:n(j.targetAnchorY),z:n(j.targetAnchorZ)},q={x:0,y:0,z:0,w:1};let desc;
   if(j.kind==='fixed')desc=RAPIER.JointData.fixed(anchor,q,target,q);
   else if(j.kind==='ball')desc=RAPIER.JointData.spherical(anchor,target);
   else{const axis={x:n(j.axisX),y:n(j.axisY,1),z:n(j.axisZ)},length=Math.hypot(axis.x,axis.y,axis.z);if(!length)throw Error('Axe nul.');for(const key of ['x','y','z'])axis[key]/=length;desc=RAPIER.JointData.revolute(anchor,target,axis)}
   const joint=world.createImpulseJoint(desc,a.body,b.body,true);joint.setContactsEnabled?.(false);
   if(j.kind==='hinge'&&j.limitsEnabled)joint.setLimits(Math.min(n(j.minAngle,-90),n(j.maxAngle,90))*Math.PI/180,Math.max(n(j.minAngle,-90),n(j.maxAngle,90))*Math.PI/180);joints.set(o.id,joint);
  }catch(error){errors.push(o.name+' : '+error.message)}
 }
 world.propagateModifiedBodyPositionsToColliders?.();
 activeScene={world,actors,joints,errors,api:RAPIER,entityCount:entities.length};return activeScene;
}
export function synchronizeRapierScene(scene,entities){
 const current=new Map(entities.map(o=>[o.id,o]));if(current.size!==scene.entityCount||entities.filter(included).length!==scene.actors.size)return false;
 for(const [id,r] of scene.actors){const o=current.get(id);if(o!==r.entity||!included(o)||bodyConfig(o)!==r.config)return false;
  if(Math.abs(n(o.w,32)/64-r.width)+Math.abs(n(o.h,32)/64-r.height)+Math.abs(n(o.depth3d,o.h||32)/64-r.depth)>1e-5)return false;
  const pos=colliderPosition3d(o),rotation=rotationQuaternion3d(o);
  if(!r.isDynamic||changed(scenePosition(o),r.lastPosition)){
   if(changed(pos,r.body.translation())){r.body.setTranslation(pos,true);if(r.isKinematic)r.body.setNextKinematicTranslation?.(pos)}
  }
  if(changed(rotation,r.lastRotation)){r.body.setRotation?.(rotation,true);r.body.setNextKinematicRotation?.(rotation);r.lastRotation=rotation}
  if(r.isDynamic&&changed(velocity(o),r.lastVelocity)){const v=velocity(o);r.body.setLinvel({x:v.x/64,y:v.y,z:v.z/64},true);r.lastVelocity=v}
  r.lastPosition=scenePosition(o);
 }
 scene.world.propagateModifiedBodyPositionsToColliders?.();return true;
}
export function moveRapierCharacter3d(scene,o,dx,dy,dz,{ignore=null}={}){
 const r=scene?.actors.get(o.id);if(!r?.controller||!r.collider)return null;
 const requested={x:n(dx)/64,y:n(dz)/64,z:n(dy)/64},position=colliderPosition3d(o);
 r.body.setTranslation(position,true);scene.world.propagateModifiedBodyPositionsToColliders?.();
 r.controller.computeColliderMovement(r.collider,requested,scene.api.QueryFilterFlags?.EXCLUDE_SENSORS,undefined,ignore?collider=>collider.handle!==scene.actors.get(ignore.id)?.collider?.handle:undefined);
 const v=r.controller.computedMovement(),p={x:position.x+v.x,y:position.y+v.y,z:position.z+v.z};
 r.body.setTranslation(p,true);r.body.setNextKinematicTranslation?.(p);
 o.x+=v.x*64;o.y+=v.z*64;o.elevation3d=Math.max(0,n(o.elevation3d)+v.y);o.grounded3d=r.controller.computedGrounded();r.lastPosition=scenePosition(o);
 scene.world.propagateModifiedBodyPositionsToColliders?.();
 return {blockedX:Math.abs(v.x-requested.x)>.001,blockedY:Math.abs(v.z-requested.z)>.001,blockedZ:Math.abs(v.y-requested.y)>.001,grounded:o.grounded3d,ceiling:requested.y>0&&v.y<requested.y-.001};
}
export function stepRapierScene(scene,dt){
 const t=Math.min(.05,Math.max(0,n(dt)));if(!t)return;scene.world.timestep=t;scene.world.step();
 for(const r of scene.actors.values()){if(!r.isDynamic)continue;const {body,entity:o,width,depth,height}=r,p=body.translation(),v=body.linvel();o.x=(p.x-width/2)*64;o.y=(p.z-depth/2)*64;o.elevation3d=Math.max(0,p.y-height/2);
  if(o.rigidbody3d){o.rigidbody3d.vx=v.x*64;o.rigidbody3d.vy=v.y;o.rigidbody3d.vz=v.z*64;r.lastVelocity=velocity(o)}
  if(o.rigidbody3d?.lockRotations===false&&body.rotation){const rotation=body.rotation();Object.assign(o,quaternionEuler3d(rotation));r.lastRotation=rotation}
  r.lastPosition=scenePosition(o);
 }
}
export function disposeRapierScene(scene){if(activeScene===scene)activeScene=null;scene?.world?.free?.();scene?.actors?.clear?.();scene?.joints?.clear?.()}
