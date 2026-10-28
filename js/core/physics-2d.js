import {getAsset} from '../assets/catalog.js';
const n=(v,d=0)=>Number.isFinite(Number(v))?Number(v):d;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const defaultCollider2d=()=>({enabled:true,isTrigger:false,offsetX:0,offsetY:0,width:0,height:0});
export const defaultRigidbody2d=()=>({enabled:true,bodyType:'dynamic',mass:1,gravity:980,gravityScale:1,restitution:0,friction:.8,vx:0,vy:0});
export const defaultController2d=()=>({mode:'auto',walkSpeed:190,sprintSpeed:295,jumpSpeed:430});
export const actor2d=o=>!!o?.controller2d||o?.type==='player'||o?.type==='character'||getAsset(o?.assetId)?.category==='Characters';
export function controllerMode2d(player,entities){
 const mode=player?.controller2d?.mode;
 if(mode==='platformer'||mode==='topDown')return mode;
 return getAsset(player?.assetId)?.pack==='platformer-art-deluxe'||entities.some(o=>{const a=getAsset(o.assetId);return a?.pack==='platformer-art-deluxe'&&a.category==='Terrain'})?'platformer':'topDown';
}
// Axis-aligned boxes, in 2D scene pixels. A zero size follows the sprite's dimensions.
export function colliderRect2d(o){const c=o.collider2d||{};return {x:n(o.x)+n(c.offsetX),y:n(o.y)+n(c.offsetY),w:Math.max(.01,n(c.width)>0?n(c.width):n(o.w,32)),h:Math.max(.01,n(c.height)>0?n(c.height):n(o.h,32))}}
export function solidCollider2d(o){
 if(!o||o._sequenceDestroyed||o.sequenceEnabled===false||o.lightType||o.audioEnabled)return false;
 if(o.collider2d)return o.collider2d.enabled!==false&&!o.collider2d.isTrigger;
 if(o.collision3d===false)return false;
 if(o.collision3d===true||o.solid2d===true||o.type==='object')return true;
 const a=getAsset(o.assetId);
 if(a?.category==='Terrain')return a.pack!=='tiny-dungeon'||['free-tiny-dungeon-tile-0014','free-tiny-dungeon-tile-0028'].includes(a.id);
 if(a?.category==='Buildings')return o.buildCollision!==false&&!['construction','destroyed'].includes(o.buildState);
 return a?.category==='Props'&&(/crate|barrel|wall|sandbag|fence|rock|stone|palisade|barrier|box/i.test(a.id));
}
const overlapAxis=(a,b,axis)=>a[axis]<b[axis]+b[axis==='x'?'w':'h']-.000001&&a[axis]+a[axis==='x'?'w':'h']>b[axis]+.000001;
export function moveBody2d(body,dx,dy,entities){
 const result={blockedX:false,blockedY:false,grounded:false,ceiling:false,hits:[]};
 if(body.collider2d?.enabled===false||!body.collider2d&&body.collision3d===false||body.collider2d?.isTrigger){body.x+=n(dx);body.y+=n(dy);body.grounded2d=false;return result}
 const obstacles=entities.filter(o=>o!==body&&solidCollider2d(o));
 // Recover an object placed partly inside a collider before Play.
 for(let iteration=0;iteration<8;iteration++){
  const start=colliderRect2d(body),hit=obstacles.find(o=>{const b=colliderRect2d(o);return overlapAxis(start,b,'x')&&overlapAxis(start,b,'y')});if(!hit)break;
  const b=colliderRect2d(hit),choices=[['x',b.x-start.x-start.w],['x',b.x+b.w-start.x],['y',b.y-start.y-start.h],['y',b.y+b.h-start.y]].sort((a,b)=>Math.abs(a[1])-Math.abs(b[1]));
  const [axis,delta]=choices[0];body[axis]+=delta;result.hits.push(hit.id);result[axis==='x'?'blockedX':'blockedY']=true;if(axis==='y'&&delta<0)result.grounded=true;
 }

 for(const [axis,desired] of [['x',n(dx)],['y',n(dy)]]){
  if(!desired)continue;const other=axis==='x'?'y':'x',size=axis==='x'?'w':'h',start=colliderRect2d(body);let delta=desired,hit=null;
  for(const obstacle of obstacles){const box=colliderRect2d(obstacle);if(!overlapAxis(start,box,other))continue;
   if(desired>0&&start[axis]+start[size]<=box[axis]+.00001){const allowed=box[axis]-start[axis]-start[size];if(allowed<delta){delta=Math.max(0,allowed);hit=obstacle}}
   else if(desired<0&&start[axis]>=box[axis]+box[size]-.00001){const allowed=box[axis]+box[size]-start[axis];if(allowed>delta){delta=Math.min(0,allowed);hit=obstacle}}
  }
  body[axis]+=delta;if(hit){result[axis==='x'?'blockedX':'blockedY']=true;result.hits.push(hit.id);if(axis==='y'){result.grounded=desired>0;result.ceiling=desired<0}}
 }
 if(!result.grounded){const box=colliderRect2d(body);result.grounded=obstacles.some(o=>{const b=colliderRect2d(o);return overlapAxis(box,b,'x')&&Math.abs(box.y+box.h-b.y)<.05})}
 body.grounded2d=result.grounded;return result;
}
export function stepPhysics2d(entities,dt,{exclude=null,only=null}={}){
 const frame=clamp(n(dt),0,.1);if(!frame)return;
 const count=Math.max(1,Math.ceil(frame/(1/120))),step=frame/count;
 for(let i=0;i<count;i++)for(const o of entities){
  const rb=o.rigidbody2d;if(o===exclude||o._netRemote&&!only||only&&o!==only||!rb?.enabled||rb.bodyType==='static')continue;
  rb.vx=clamp(n(rb.vx),-100000,100000);rb.vy=clamp(n(rb.vy),-100000,100000);
  if(rb.bodyType!=='kinematic')rb.vy+=clamp(n(rb.gravity,980),-10000,10000)*clamp(n(rb.gravityScale,1),-10,10)*step;
  const result=moveBody2d(o,rb.vx*step,rb.vy*step,entities),bounce=clamp(n(rb.restitution),0,1);
  if(result.blockedX)rb.vx=-rb.vx*bounce;if(result.blockedY)rb.vy=Math.abs(rb.vy)<20?0:-rb.vy*bounce;
  if(result.grounded&&rb.bodyType!=='kinematic'){rb.vx*=Math.pow(1-clamp(n(rb.friction,.8),0,1),step*10);if(Math.abs(rb.vx)<.01)rb.vx=0}
 }
}
export function walkPlatformer2d(player,dt,keys,entities){
 const cfg=player.controller2d||defaultController2d();player.rigidbody2d??=defaultRigidbody2d();const rb=player.rigidbody2d;
 if(rb.enabled===false||rb.bodyType==='static')return {moving:false,sprinting:false,mode:'platformer'};
 const frame=clamp(n(dt),0,.1),axis=Number(keys.has('d')||keys.has('arrowright'))-Number(keys.has('a')||keys.has('q')||keys.has('arrowleft'));
 const jump=keys.has(' ')||keys.has('space')||keys.has('w')||keys.has('z')||keys.has('arrowup'),sprint=keys.has('shift');
 const support=moveBody2d(player,0,.001,entities);if(support.grounded&&n(rb.vy)>=0)rb.vy=0;
 if(jump&&!player._jump2dHeld&&support.grounded&&rb.enabled!==false)rb.vy=-Math.max(0,n(cfg.jumpSpeed,430));player._jump2dHeld=jump;
 rb.vx=axis*Math.max(0,n(sprint?cfg.sprintSpeed:cfg.walkSpeed,sprint?295:190))*(player.survival?.enabled!==false&&player.survival&&player.survivalState?.rest<15?.6:1);
 stepPhysics2d(entities.includes(player)?entities:[player,...entities],frame,{only:player});
 // Other bodies are stepped by the scene runtime, not again by the controller.
 return {moving:axis!==0,sprinting:axis!==0&&sprint,mode:'platformer'};
}

export function applyImpulse2d(o,x,y){const rb=o?.rigidbody2d;if(!rb?.enabled||rb.bodyType==='static'||rb.bodyType==='kinematic')return false;const mass=Math.max(.01,n(rb.mass,1));rb.vx=n(rb.vx)+n(x)/mass;rb.vy=n(rb.vy)+n(y)/mass;return true}
