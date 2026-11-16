import {solidBody3d,activeBody3d,supportBody3d} from './collision-3d.js';
import {updateAffineEditorPose3d,affineCorrection3d,legacyReferenceMatrix3d,hasAffinePose} from './scene-graph-v2.js';
import {characterBody3d,colliderGeometry3d,colliderPosition3d,rotationQuaternion3d,quaternionEuler3d,affineBoxHull3d,affineHullSignature3d} from './collider-3d.js';
import {installCollisionBackend3d,releaseCollisionBackend3d} from './collision-backend-3d.js';
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
const included=o=>activeBody3d(o)&&o.collision3d!==false&&o.collider3d?.enabled!==false&&(solidBody3d(o)||characterBody3d(o));
const dynamic=o=>!!o.rigidbody3d?.enabled&&!o.rigidbody3d.kinematic&&!characterBody3d(o)&&!o.ai?.enabled;
const bodyConfig=o=>JSON.stringify([dynamic(o),characterBody3d(o),o.rigidbody3d,o.collider3d,o.controller3d,o.joint3d,!!o.ai?.enabled].map((v,i)=>i===2&&v?Object.fromEntries(Object.entries(v).filter(([k])=>!['vx','vy','vz'].includes(k))):v));
const scenePosition=o=>({x:n(o.x),y:n(o.y),z:n(o.elevation3d)});
const velocity=o=>({x:n(o.rigidbody3d?.vx),y:n(o.rigidbody3d?.vy),z:n(o.rigidbody3d?.vz)});
const changed=(a,b)=>Object.keys(a).some(k=>Math.abs(a[k]-n(b?.[k]))>1e-5);
const skippedColliderSignature=o=>bodyConfig(o)+'|'+JSON.stringify(affineCorrection3d(o)?.map(v=>Math.round(v*1e5)/1e5)||null);
const affineColliderData=(o,g,pos,rotation)=>{
 // Gameplay scripts may teleport/rotate actors before the viewport redraw.
 // Keep the visual reference and collider transformation in sync immediately.
 if(hasAffinePose(o)){
  const reference=legacyReferenceMatrix3d(o);
  if(reference.some((v,i)=>Math.abs(v-o.matrixReference3d[i])>1e-8))
   updateAffineEditorPose3d(o,[...o.worldMatrix3d],[...o.matrixReference3d]);
 }
 const correction=affineCorrection3d(o);
 if(!correction)return null;
 if(g.shape!=='box')throw Error('Collider sous shear : seuls les BoxColliders disposent pour le moment d’une forme exacte. Convertis ce collider en boîte ou crée un compound adapté.');
 const points=affineBoxHull3d(correction,g,pos,rotation);
 return {points,signature:affineHullSignature3d(points)};
};

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
 const world=new RAPIER.World({x:0,y:-Math.max(0,gravity),z:0}),actors=new Map(),joints=new Map(),errors=[],skipped=new Map();
 for(const o of entities){
  if(!included(o))continue;
  const g=colliderGeometry3d(o),pos=colliderPosition3d(o,g),isCharacter=characterBody3d(o),isDynamic=dynamic(o),isKinematic=isCharacter||o.rigidbody3d?.kinematic===true;
  const desc=(isDynamic?RAPIER.RigidBodyDesc.dynamic():isKinematic&&RAPIER.RigidBodyDesc.kinematicPositionBased?RAPIER.RigidBodyDesc.kinematicPositionBased():RAPIER.RigidBodyDesc.fixed()).setTranslation(pos.x,pos.y,pos.z);
  const rotation=rotationQuaternion3d(o);desc.setRotation?.(rotation);
  if(isDynamic){const v=velocity(o);desc.setLinvel(v.x/64,v.y,v.z/64);desc.setCcdEnabled?.(o.rigidbody3d.ccd!==false);desc.setGravityScale?.(Math.max(0,n(o.rigidbody3d.gravity,15))/Math.max(.001,gravity));if(o.rigidbody3d.lockRotations!==false)desc.lockRotations?.()}
  // A sheared box is an exact convex polyhedron. Never fall back to a regular
  // cuboid when a custom affine shape cannot be built.
  let affine=null;
  try{affine=affineColliderData(o,g,pos,rotation)}catch(error){errors.push(o.name+' : collision désactivée — '+error.message);skipped.set(o.id,{entity:o,signature:skippedColliderSignature(o)});continue}
  if(affine&&typeof RAPIER.ColliderDesc.convexHull!=='function'){
   errors.push(o.name+' : collision désactivée — ce runtime Rapier ne prend pas en charge les convex hulls sous shear.');skipped.set(o.id,{entity:o,signature:skippedColliderSignature(o)});continue;
  }
  const colliderDesc=affine?RAPIER.ColliderDesc.convexHull(affine.points):g.shape==='capsule'?RAPIER.ColliderDesc.capsule(g.halfHeight,g.radius):g.shape==='sphere'?RAPIER.ColliderDesc.ball(g.radius):RAPIER.ColliderDesc.cuboid(g.w/2,g.h/2,g.d/2);
  if(!colliderDesc){errors.push(o.name+' : collision désactivée — impossible de créer le convex hull du collider affine.');skipped.set(o.id,{entity:o,signature:skippedColliderSignature(o)});continue}
  const body=world.createRigidBody(desc);
  // Offset was already baked into affine hull vertices.
  if(!affine)colliderDesc.setTranslation?.(g.offset.x,g.offset.y,g.offset.z);
  colliderDesc.setRestitution?.(clamp(o.rigidbody3d?.restitution??.2,0,1));colliderDesc.setFriction?.(clamp(o.rigidbody3d?.friction??.82,0,2));if(isDynamic)colliderDesc.setMass?.(Math.max(.01,n(o.rigidbody3d.mass,1)));
  const collider=world.createCollider(colliderDesc,body),controller=isCharacter||o.ai?.enabled?controllerFor(world,o):null;
  actors.set(o.id,{body,collider,controller,entity:o,geometry:g,width:n(o.w,32)/64,depth:n(o.depth3d,o.h||32)/64,height:n(o.h,32)/64,isDynamic,isKinematic,isCharacter,config:bodyConfig(o),affineHullSignature:affine?.signature||null,lastPosition:scenePosition(o),lastVelocity:velocity(o),lastRotation:rotation});
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
 activeScene={world,actors,joints,skipped,errors,api:RAPIER,entityCount:entities.length,entities:new Set(entities),colliderEntities:new Map([...actors.values()].filter(r=>r.collider).map(r=>[r.collider.handle,r.entity]))};return activeScene;
}
// Activate only for a live 3D Play session. Independent physics tests and 2D
// previews must not accidentally acquire this world's collision ownership.
export function activateRapierQueries3d(scene){
 installCollisionBackend3d({owner:scene,name:'rapier',
  owns:o=>scene.entities.has(o),ownsEntities:entities=>entities.length>0&&entities.every(o=>scene.entities.has(o)),
  move:(o,x,y,z,options)=>moveRapierBody3d(scene,o,x,y,z,options),
  canPlace:(o,pose,options)=>canPlaceRapierBody3d(scene,o,pose,options),
  raycast:(origin,direction,entities,options)=>raycastRapierScene3d(scene,origin,direction,entities,options)});
}
export function synchronizeRapierScene(scene,entities){
 const current=new Map(entities.map(o=>[o.id,o]));if(current.size!==scene.entityCount||entities.filter(included).length!==scene.actors.size+(scene.skipped?.size||0))return false;
 for(const [id,r] of scene.skipped||[]){const o=current.get(id);if(o!==r.entity||!included(o)||skippedColliderSignature(o)!==r.signature)return false;}
 for(const [id,r] of scene.actors){const o=current.get(id);if(o!==r.entity||!included(o)||bodyConfig(o)!==r.config)return false;
  if(Math.abs(n(o.w,32)/64-r.width)+Math.abs(n(o.h,32)/64-r.height)+Math.abs(n(o.depth3d,o.h||32)/64-r.depth)>1e-5)return false;
  const pos=colliderPosition3d(o),rotation=rotationQuaternion3d(o);
  let affine=null;
  try{affine=affineColliderData(o,colliderGeometry3d(o),pos,rotation)}catch{return false}
  // If the authored affine shape changes, rebuild the physics shape. A pose
  // translation alone keeps the same body-local vertex hull.
  if((affine?.signature||null)!==r.affineHullSignature)return false;
  if(!r.isDynamic||changed(scenePosition(o),r.lastPosition)){
   if(changed(pos,r.body.translation())){r.body.setTranslation(pos,true);if(r.isKinematic)r.body.setNextKinematicTranslation?.(pos)}
  }
  if(changed(rotation,r.lastRotation)){r.body.setRotation?.(rotation,true);r.body.setNextKinematicRotation?.(rotation);r.lastRotation=rotation}
  if(r.isDynamic&&changed(velocity(o),r.lastVelocity)){const v=velocity(o);r.body.setLinvel({x:v.x/64,y:v.y,z:v.z/64},true);r.lastVelocity=v}
  r.lastPosition=scenePosition(o);
 }
 scene.world.propagateModifiedBodyPositionsToColliders?.();return true;
}
export function moveRapierCharacter3d(scene,o,dx,dy,dz,{ignore=null,entities=null}={}){
 const r=scene?.actors.get(o.id);if(!r?.controller||!r.collider)return null;
 const requested={x:n(dx)/64,y:n(dz)/64,z:n(dy)/64},position=colliderPosition3d(o);
 // Scripts, doors, vehicles and AI may have moved since the frame began.
 // Update all current collider poses before any controller or ray query.
 refreshRapierQueryPoses3d(scene);
 r.body.setTranslation(position,true);scene.world.propagateModifiedBodyPositionsToColliders?.();
 const allowed=entities?new Set(entities):null;
 r.controller.computeColliderMovement(r.collider,requested,scene.api.QueryFilterFlags?.EXCLUDE_SENSORS,undefined,collider=>{
  const other=scene.colliderEntities.get(collider.handle);
  return !!other&&other!==ignore&&included(other)&&(!allowed||allowed.has(other));
 });
 const raw=r.controller.computedMovement(),v={x:raw.x,y:raw.y,z:raw.z};
 // Rapier can drift through a flat support when repeatedly moving a stationary
 // kinematic capsule. Correct only against a real support under the destination;
 // sloped/rotated surfaces remain entirely under Rapier's control.
 if(requested.y<=0&&v.y<0){
  const destination={...o,x:n(o.x)+v.x*64,y:n(o.y)+v.z*64};
  const support=supportBody3d(destination,entities||[...scene.actors.values()].map(actor=>actor.entity));
  if(support&&!n(support.rotationX3d)&&!n(support.rotationZ3d)&&!hasAffinePose(support)){
   const top=n(support.elevation3d)+n(support.h,32)/64;
   v.y=Math.max(v.y,top-n(o.elevation3d));
  }
 }
 const p={x:position.x+v.x,y:position.y+v.y,z:position.z+v.z};
 r.body.setTranslation(p,true);r.body.setNextKinematicTranslation?.(p);
 o.x+=v.x*64;o.y+=v.z*64;o.elevation3d=n(o.elevation3d)+v.y;o.grounded3d=r.controller.computedGrounded();r.lastPosition=scenePosition(o);
 scene.world.propagateModifiedBodyPositionsToColliders?.();
 return {blockedX:Math.abs(v.x-requested.x)>.001,blockedY:Math.abs(v.z-requested.z)>.001,blockedZ:Math.abs(v.y-requested.y)>.001,grounded:o.grounded3d,ceiling:requested.y>0&&v.y<requested.y-.001,hits:[]};
}
function refreshRapierQueryPoses3d(scene){
 for(const r of scene.actors.values()){
  const o=r.entity;if(!included(o))continue;
  const position=colliderPosition3d(o),rotation=rotationQuaternion3d(o);
  if(changed(position,r.body.translation()))r.body.setTranslation(position,true);
  if(changed(rotation,r.lastRotation)){r.body.setRotation(rotation,true);r.lastRotation=rotation;}
 }
 scene.world.propagateModifiedBodyPositionsToColliders?.();
}
export function canPlaceRapierBody3d(scene,o,pose,{ignore=null}={}){
 refreshRapierQueryPoses3d(scene);
 const candidate={...o,...pose},g=colliderGeometry3d(candidate),p=colliderPosition3d(candidate),q=rotationQuaternion3d(candidate),skin=.005;
 const shape=g.shape==='capsule'?new scene.api.Capsule(g.halfHeight,Math.max(.001,g.radius-skin)):g.shape==='sphere'?new scene.api.Ball(Math.max(.001,g.radius-skin)):new scene.api.Cuboid(Math.max(.001,g.w/2-skin),Math.max(.001,g.h/2-skin),Math.max(.001,g.d/2-skin));
 const v=g.offset,t={x:2*(q.y*v.z-q.z*v.y),y:2*(q.z*v.x-q.x*v.z),z:2*(q.x*v.y-q.y*v.x)};
 const position={x:p.x+v.x+q.w*t.x+q.y*t.z-q.z*t.y,y:p.y+v.y+q.w*t.y+q.z*t.x-q.x*t.z,z:p.z+v.z+q.w*t.z+q.x*t.y-q.y*t.x};
 for(const r of scene.actors.values())if(r.entity!==o&&r.entity!==ignore&&included(r.entity)&&r.collider.intersectsShape(shape,position,q))return false;
 return true;
}
export function moveRapierBody3d(scene,o,dx,dy,dz,options={}){
 const free={blockedX:false,blockedY:false,blockedZ:false,grounded:false,ceiling:false,hits:[]};
 if(!activeBody3d(o))return free;
 const r=scene.actors.get(o.id);
 if(o.collision3d===false||o.collider3d?.enabled===false||!r){
  // A collider rejected for shear must not quietly revert to an AABB.
  if(scene.skipped.has(o.id))return {...free,blockedX:true,blockedY:true,blockedZ:true};
  o.x=n(o.x)+n(dx);o.y=n(o.y)+n(dy);o.elevation3d=n(o.elevation3d)+n(dz)/64;return free;
 }
 if(!r.controller){
  r.controller=scene.world.createCharacterController(.01);
  r.controller.setSlideEnabled(true);r.controller.setApplyImpulsesToDynamicBodies(false);
  // Arcade vehicles keep their authored steering. This controller sweeps their
  // oriented box; it does not introduce suspension or character autosteps.
 }
 return moveRapierCharacter3d(scene,o,dx,dy,dz,options);
}
export function raycastRapierScene3d(scene,origin,direction,entities,{exclude=null,maxDistance=45,target=()=>false}={}){
 const length=Math.hypot(...direction);if(!length)return null;
 refreshRapierQueryPoses3d(scene);
 const ray=new scene.api.Ray({x:origin[0],y:origin[1],z:origin[2]},{x:direction[0]/length,y:direction[1]/length,z:direction[2]/length});
 let nearest=null,distance=maxDistance;
 for(const o of entities){
  const isTarget=target(o);
  if(o===exclude||!activeBody3d(o)||(!solidBody3d(o)&&!isTarget))continue;
  const r=scene.actors.get(o.id);
  // Collider-local cast avoids the query pipeline's one-step latency when an
  // interaction opens a door immediately before a shot.
  let hit=-1;
  if(r&&included(o))hit=r.collider.castRay(ray,maxDistance,true);
  else if(isTarget&&!scene.skipped.has(o.id)){
   const g=colliderGeometry3d(o),p=colliderPosition3d(o),q=rotationQuaternion3d(o);
   const shape=g.shape==='capsule'?new scene.api.Capsule(g.halfHeight,g.radius):g.shape==='sphere'?new scene.api.Ball(g.radius):new scene.api.Cuboid(g.w/2,g.h/2,g.d/2);
   const v=g.offset,t={x:2*(q.y*v.z-q.z*v.y),y:2*(q.z*v.x-q.x*v.z),z:2*(q.x*v.y-q.y*v.x)};
   const offset={x:v.x+q.w*t.x+q.y*t.z-q.z*t.y,y:v.y+q.w*t.y+q.z*t.x-q.x*t.z,z:v.z+q.w*t.z+q.x*t.y-q.y*t.x};
   hit=shape.castRay(ray,{x:p.x+offset.x,y:p.y+offset.y,z:p.z+offset.z},q,maxDistance,true);
  }
  if(hit>=0&&hit<=distance){distance=hit;nearest=o;}
 }
 return nearest?{entity:nearest,distance,point:{x:(origin[0]+direction[0]/length*distance)*64,y:(origin[2]+direction[2]/length*distance)*64,z:(origin[1]+direction[1]/length*distance)*64}}:null;
}
export function stepRapierScene(scene,dt){
 const t=Math.min(.05,Math.max(0,n(dt)));if(!t)return;scene.world.timestep=t;scene.world.step();
 for(const r of scene.actors.values()){if(!r.isDynamic)continue;const {body,entity:o,width,depth,height}=r,p=body.translation(),v=body.linvel();const oldAffine=Array.isArray(o.worldMatrix3d)?[...o.worldMatrix3d]:null,oldReference=Array.isArray(o.matrixReference3d)?[...o.matrixReference3d]:null;o.x=(p.x-width/2)*64;o.y=(p.z-depth/2)*64;o.elevation3d=p.y-height/2;
  if(o.rigidbody3d){o.rigidbody3d.vx=v.x*64;o.rigidbody3d.vy=v.y;o.rigidbody3d.vz=v.z*64;r.lastVelocity=velocity(o)}
  if(o.rigidbody3d?.lockRotations===false&&body.rotation){const rotation=body.rotation();Object.assign(o,quaternionEuler3d(rotation));r.lastRotation=rotation}
  if(oldAffine&&oldReference)updateAffineEditorPose3d(o,oldAffine,oldReference);
  r.lastPosition=scenePosition(o);
 }
 // The rigidbody pose is now synchronized. Report resting support in the
 // same public grounded3d field as the built-in solver. Evaluate after all
 // actors moved, otherwise dynamic-on-dynamic supports depend on loop order.
 const supports=[...scene.actors.values()].map(actor=>actor.entity);
 for(const actor of scene.actors.values())if(actor.isDynamic){
  const o=actor.entity;
  o.grounded3d=!!supportBody3d(o,supports,.3);
 }
}
export function disposeRapierScene(scene){releaseCollisionBackend3d(scene);if(activeScene===scene)activeScene=null;scene?.world?.free?.();scene?.actors?.clear?.();scene?.skipped?.clear?.();scene?.joints?.clear?.()}
