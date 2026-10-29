// Shared axis-aligned collision geometry. Ground X/Z and sizes are scene pixels;
// elevation is meters on entities and pixels in these boxes (64 pixels = 1 m).
import {traceNativeSegments3d} from './native-3d.js';
const n=(v,d=0)=>Number.isFinite(Number(v))?Number(v):d;
const epsilon=.00001;
const axes=[['x','w'],['y','d'],['z','h']];
export const activeBody3d=o=>!!o&&o.sequenceEnabled!==false&&!o._sequenceDestroyed&&!o._hiddenInVehicle&&!o._hiddenInHouse&&!o._modeEliminated;
export const solidBody3d=o=>activeBody3d(o)&&o.collision3d!==false&&!o.lightType&&!o.audioEnabled&&(o.solid3d===true||o.type==='object'||o.type==='mesh3d'||!!o.collider3d);
export const collisionBox3d=o=>({x:n(o.x),y:n(o.y),z:n(o.elevation3d)*64,w:Math.max(1,n(o.w,32)),d:Math.max(1,n(o.depth3d,o.h||32)),h:Math.max(1,n(o.h,32))});
export const collisionWorldBounds3d=o=>{const b=collisionBox3d(o);return {x:(b.x+b.w/2)/64,y:(b.z+b.h/2)/64,z:(b.y+b.d/2)/64,w:b.w/64,h:b.h/64,d:b.d/64}};
const overlapAxis=(a,b,axis,size)=>a[axis]<b[axis]+b[size]-epsilon&&a[axis]+a[size]>b[axis]+epsilon;
export const boxesOverlap3d=(a,b)=>axes.every(([axis,size])=>overlapAxis(a,b,axis,size));
const translate=(o,axis,delta)=>{if(axis==='z')o.elevation3d=n(o.elevation3d)+delta/64;else o[axis]=n(o[axis])+delta};
export function supportBody3d(o,entities,tolerance=2.3){
 const box=collisionBox3d(o);return entities.filter(e=>e!==o&&solidBody3d(e)).find(e=>{const b=collisionBox3d(e);return overlapAxis(box,b,'x','w')&&overlapAxis(box,b,'y','d')&&Math.abs(box.z-b.z-b.h)<=tolerance})||null;
}
// Axis sweeps prevent tunnelling independently of frame time or obstacle thickness.
export function moveBody3d(body,dx,dy,dz,entities,{recover=true,ignore=null}={}){
 const result={blockedX:false,blockedY:false,blockedZ:false,grounded:false,ceiling:false,hits:[]};
 const obstacles=body.collision3d===false?[]:entities.filter(o=>o!==body&&o!==ignore&&solidBody3d(o));
 body.x=n(body.x);body.y=n(body.y);body.elevation3d=Math.max(0,n(body.elevation3d));
 if(recover)for(let i=0;i<8;i++){
  const box=collisionBox3d(body),other=obstacles.find(o=>boxesOverlap3d(box,collisionBox3d(o)));if(!other)break;
  const b=collisionBox3d(other),options=axes.flatMap(([axis,size])=>[[axis,b[axis]-box[axis]-box[size]],[axis,b[axis]+b[size]-box[axis]]]).filter(([axis,delta])=>axis!=='z'||box.z+delta>=-epsilon).sort((a,b)=>Math.abs(a[1])-Math.abs(b[1]));
  if(!options.length)break;const [axis,delta]=options[0];translate(body,axis,delta);result.hits.push(other.id);if(axis==='z'&&delta>0)result.grounded=true;
 }
 for(const [axis,size,value] of [['x','w',n(dx)],['y','d',n(dy)],['z','h',n(dz)]]){
  if(!value)continue;const box=collisionBox3d(body);let delta=value,hit=null;
  for(const o of obstacles){const b=collisionBox3d(o);if(!axes.every(([a,s])=>a===axis||overlapAxis(box,b,a,s)))continue;
   if(value>0&&box[axis]+box[size]<=b[axis]+epsilon){const allowed=Math.max(0,b[axis]-box[axis]-box[size]);if(allowed<delta){delta=allowed;hit=o}}
   else if(value<0&&box[axis]>=b[axis]+b[size]-epsilon){const allowed=Math.min(0,b[axis]+b[size]-box[axis]);if(allowed>delta){delta=allowed;hit=o}}
  }
  if(axis==='z'&&box.z+delta<0){delta=-box.z;hit={id:null}}
  translate(body,axis,delta);
  if(hit&&Number.isFinite(hit.x)){const b=collisionBox3d(hit),position=value>0?b[axis]-box[size]:b[axis]+b[size];if(axis==='z')body.elevation3d=position/64;else body[axis]=position}
  if(hit){result['blocked'+axis.toUpperCase()]=true;if(hit.id!=null)result.hits.push(hit.id);if(axis==='z'){result.grounded=value<0;result.ceiling=value>0}}
 }
 body.elevation3d=Math.max(0,n(body.elevation3d));result.grounded||=body.elevation3d<=epsilon||!!supportBody3d(body,obstacles,.01);result.hits=[...new Set(result.hits)];return result;
}
export function segmentBox3d(from,to,box,padding=0){
 let near=0,far=1;for(const [axis,size] of axes){const start=n(from[axis]),delta=n(to[axis])-start,low=box[axis]-padding,high=box[axis]+box[size]+padding;
  if(Math.abs(delta)<1e-8){if(start<low||start>high)return null;continue}const a=(low-start)/delta,b=(high-start)/delta;near=Math.max(near,Math.min(a,b));far=Math.min(far,Math.max(a,b));if(near>far)return null;
 }return near>=0&&near<=1?near:null;
}
// World-space ray, used by aimed fire. The nearest solid blocks targets behind it.
export function raycastScene3d(origin,direction,entities,{exclude=null,maxDistance=45,target=()=>false}={}){
 if(![origin?.[0],origin?.[1],origin?.[2],direction?.[0],direction?.[1],direction?.[2],maxDistance].every(Number.isFinite)||maxDistance<0)return null;
 const length=Math.hypot(...direction);if(!length||!Number.isFinite(length))return null;const from={x:origin[0]*64,y:origin[2]*64,z:origin[1]*64},to={x:from.x+direction[0]/length*maxDistance*64,y:from.y+direction[2]/length*maxDistance*64,z:from.z+direction[1]/length*maxDistance*64};let nearest=null,distance=Infinity;
 const candidates=entities.filter(o=>o!==exclude&&activeBody3d(o)&&(solidBody3d(o)||target(o)));
 if(!candidates.length)return null;
 const boxes=candidates.map(collisionBox3d),accelerated=traceNativeSegments3d([{from,to}],boxes);
 if(accelerated!==null){const hit=accelerated[0];if(hit.index<0)return null;nearest=candidates[hit.index];distance=hit.fraction}
 else for(let i=0;i<candidates.length;i++){const t=segmentBox3d(from,to,boxes[i]);if(t!==null&&t<distance){distance=t;nearest=candidates[i]}}
 return nearest?{entity:nearest,distance:distance*maxDistance,point:{x:from.x+(to.x-from.x)*distance,y:from.y+(to.y-from.y)*distance,z:from.z+(to.z-from.z)*distance}}:null;
}
