import {colliderShape2d,colliderDepenetration2d,colliderSweep2d} from './collider-shapes-2d.js';
import {applyPhysicsTools2d,solveJoint2d} from './physics-tools-2d.js';
export {colliderShape2d} from './collider-shapes-2d.js';
import {getAsset} from '../assets/catalog.js';
import {tilemapColliders2d} from './tilemap-2d.js';
const n=(v,d=0)=>Number.isFinite(Number(v))?Number(v):d;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const defaultCollider2d=()=>({enabled:true,shape:'box',radius:0,isTrigger:false,offsetX:0,offsetY:0,width:0,height:0,layer:0,mask:4294967295});
export const defaultRigidbody2d=()=>({enabled:true,bodyType:'dynamic',mass:1,gravity:980,gravityScale:1,restitution:0,friction:.8,vx:0,vy:0});
export const defaultController2d=()=>({mode:'auto',walkSpeed:190,sprintSpeed:295,jumpSpeed:430,coyoteTime:.1,jumpBuffer:.12});
export const actor2d=o=>!!o?.controller2d||o?.type==='player'||o?.type==='character'||getAsset(o?.assetId)?.category==='Characters';
export function controllerMode2d(player,entities){
 const mode=player?.controller2d?.mode;
 if(mode==='platformer'||mode==='topDown')return mode;
 return getAsset(player?.assetId)?.pack==='platformer-art-deluxe'||entities.some(o=>{const a=getAsset(o.assetId);return a?.pack==='platformer-art-deluxe'&&a.category==='Terrain'})?'platformer':'topDown';
}
// Older colliders without a shape remain axis-aligned boxes.
export function colliderRect2d(o){const {x,y,w,h}=colliderShape2d(o);return {x,y,w,h}}
// Layer 0..31 and unsigned bit mask. Older scenes without these fields collide normally.
export function collisionLayersAllow2d(a,b){
 const layer=o=>Number.isInteger(o?.collider2d?.layer)&&o.collider2d.layer>=0&&o.collider2d.layer<32?o.collider2d.layer:0;
 const mask=o=>Number.isInteger(o?.collider2d?.mask)&&o.collider2d.mask>=0&&o.collider2d.mask<=4294967295?o.collider2d.mask>>>0:4294967295;
 return !!(mask(a)&(1<<layer(b)))&&!!(mask(b)&(1<<layer(a)));
}
export function solidCollider2d(o){
 if(!o||o.enabled===false||o._sequenceDestroyed||o.sequenceEnabled===false||o.lightType||o.audioEnabled)return false;
 if(o.tilemap2d)return false; // Solid cells are individual collision rectangles.
 if(o.collision2d===false)return false; // Explicit 2D opt-out, independent of 3D collision flags.
 if(o.collider2d)return o.collider2d.enabled!==false&&!o.collider2d.isTrigger;
 if(o.collision3d===false)return false;
 if(o.collision3d===true||o.solid2d===true||o.type==='object')return true;
 const a=getAsset(o.assetId);
 if(a?.category==='Terrain')return a.pack!=='tiny-dungeon'||['free-tiny-dungeon-tile-0014','free-tiny-dungeon-tile-0028'].includes(a.id);
 if(a?.category==='Buildings')return o.buildCollision!==false&&!['construction','destroyed'].includes(o.buildState);
 return a?.category==='Props'&&(/crate|barrel|wall|sandbag|fence|rock|stone|palisade|barrier|box/i.test(a.id));
}
export function moveBody2d(body,dx,dy,entities){
 const result={blockedX:false,blockedY:false,grounded:false,ceiling:false,hits:[]};
 if(body.enabled===false)return result;
 if(body.collider2d?.enabled===false||!body.collider2d&&(body.collision2d===false||body.collision3d===false)||body.collider2d?.isTrigger){body.x+=n(dx);body.y+=n(dy);body.grounded2d=false;return result}
 const obstacles=[...entities.filter(o=>o!==body&&solidCollider2d(o)&&collisionLayersAllow2d(body,o)),...tilemapColliders2d(entities.filter(o=>o!==body)).filter(o=>collisionLayersAllow2d(body,o))];
 for(let iteration=0;iteration<8;iteration++){
  const shape=colliderShape2d(body);let correction=null,hit=null;
  for(const obstacle of obstacles){correction=colliderDepenetration2d(shape,colliderShape2d(obstacle));if(correction){hit=obstacle;break}}
  if(!correction)break;
  body.x+=correction.x;body.y+=correction.y;result.hits.push(hit.id);
  if(Math.abs(correction.x)>1e-7)result.blockedX=true;
  if(Math.abs(correction.y)>1e-7){result.blockedY=true;if(correction.y<0)result.grounded=true;else result.ceiling=true}
 }
 for(const [axis,desired] of [['x',n(dx)],['y',n(dy)]]){
  if(!desired)continue;const shape=colliderShape2d(body);let delta=desired,hit=null;
  for(const obstacle of obstacles){const allowed=colliderSweep2d(shape,colliderShape2d(obstacle),axis,desired);if(Math.abs(allowed)<Math.abs(delta)){delta=allowed;hit=obstacle}}
  body[axis]+=delta;if(hit){result[axis==='x'?'blockedX':'blockedY']=true;result.hits.push(hit.id);if(axis==='y'){result.grounded=desired>0;result.ceiling=desired<0}}
 }
 if(!result.grounded){const shape=colliderShape2d(body);result.grounded=obstacles.some(o=>colliderSweep2d(shape,colliderShape2d(o),'y',.05)<.05-1e-7)}
 body.grounded2d=result.grounded;return result;
}
export function stepPhysics2d(entities,dt,{exclude=null,only=null}={}){
 const frame=clamp(n(dt),0,.1);if(!frame)return;
 const count=Math.max(1,Math.ceil(frame/(1/120))),step=frame/count;
 for(let i=0;i<count;i++)for(const o of entities){
  const rb=o.rigidbody2d;if(o.enabled===false||o._sequenceDestroyed||o===exclude||o._netRemote&&!only||only&&o!==only||!rb?.enabled||rb.bodyType==='static')continue;
  rb.vx=clamp(n(rb.vx),-100000,100000);rb.vy=clamp(n(rb.vy),-100000,100000);
  applyPhysicsTools2d(o,entities,step);
  if(rb.bodyType!=='kinematic')rb.vy+=clamp(n(rb.gravity,980),-10000,10000)*clamp(n(rb.gravityScale,1),-10,10)*step;
  const result=moveBody2d(o,rb.vx*step,rb.vy*step,entities),bounce=clamp(n(rb.restitution),0,1);
  if(result.blockedX)rb.vx=-rb.vx*bounce;if(result.blockedY)rb.vy=Math.abs(rb.vy)<20?0:-rb.vy*bounce;
  solveJoint2d(o,entities,moveBody2d);
  if(result.grounded&&rb.bodyType!=='kinematic'){rb.vx*=Math.pow(1-clamp(n(rb.friction,.8),0,1),step*10);if(Math.abs(rb.vx)<.01)rb.vx=0}
 }
}
export function walkPlatformer2d(player,dt,keys,entities,{pressedKeys=new Set()}={}){
 const cfg=player.controller2d||defaultController2d();player.rigidbody2d??=defaultRigidbody2d();const rb=player.rigidbody2d;
 if(rb.enabled===false||rb.bodyType==='static')return {moving:false,sprinting:false,mode:'platformer'};
 const frame=clamp(n(dt),0,.1),axis=Number(keys.has('d')||keys.has('arrowright'))-Number(keys.has('a')||keys.has('q')||keys.has('arrowleft'));
 const jump=keys.has(' ')||keys.has('space')||keys.has('w')||keys.has('z')||keys.has('arrowup'),sprint=keys.has('shift');
 const support=moveBody2d(player,0,.001,entities);if(support.grounded&&n(rb.vy)>=0)rb.vy=0;
 // Forgive a slightly late edge jump or a press just before landing. Holding
 // jump still launches only once; these timers are runtime state on the actor.
 const pressed=jump&&!player._jump2dHeld||[' ','space','w','z','arrowup'].some(key=>pressedKeys.has(key));
 player._jump2dGrace=support.grounded&&n(rb.vy)>=0?clamp(n(cfg.coyoteTime,.1),0,.25):Math.max(0,n(player._jump2dGrace)-frame);
 player._jump2dBuffer=pressed?Math.max(frame,clamp(n(cfg.jumpBuffer,.12),0,.25)):Math.max(0,n(player._jump2dBuffer)-frame);
 if(player._jump2dBuffer>0&&(support.grounded&&n(rb.vy)>=0||player._jump2dGrace>0)){
  rb.vy=-Math.max(0,n(cfg.jumpSpeed,430));player._jump2dBuffer=0;player._jump2dGrace=0;
 }
 player._jump2dHeld=jump;
 rb.vx=axis*Math.max(0,n(sprint?cfg.sprintSpeed:cfg.walkSpeed,sprint?295:190))*(player.survival?.enabled!==false&&player.survival&&player.survivalState?.rest<15?.6:1);
 stepPhysics2d(entities.includes(player)?entities:[player,...entities],frame,{only:player});
 // Other bodies are stepped by the scene runtime, not again by the controller.
 return {moving:axis!==0,sprinting:axis!==0&&sprint,mode:'platformer'};
}

export function applyImpulse2d(o,x,y){const rb=o?.rigidbody2d;if(!rb?.enabled||rb.bodyType==='static'||rb.bodyType==='kinematic')return false;const mass=Math.max(.01,n(rb.mass,1));rb.vx=n(rb.vx)+n(x)/mass;rb.vy=n(rb.vy)+n(y)/mass;return true}

 // A deterministic ping-pong trajectory; collision and rider transport use the native physics caller.
export function samplePlatformMotion(origin,destination,elapsed,duration){
 if(!origin||!destination||![origin.x,origin.y,destination.x,destination.y,elapsed,duration].every(Number.isFinite)||duration<=0)return null;
 const phase=((elapsed/duration%2)+2)%2,t=phase<=1?phase:2-phase;
 return {x:origin.x+(destination.x-origin.x)*t,y:origin.y+(destination.y-origin.y)*t};
}
