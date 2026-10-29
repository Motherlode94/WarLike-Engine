// Physics dimensions are meters; scene positions and visual sizes use 64 px/m.
const n=(v,d=0)=>Number.isFinite(Number(v))?Number(v):d;
const positive=(v,d)=>n(v)>0?n(v):d;
export const defaultCollider3d=()=>({shape:'box',width:0,height:0,depth:0,radius:0,offsetX:0,offsetY:0,offsetZ:0});
export const defaultJoint3d=()=>({enabled:true,kind:'hinge',targetId:0,anchorX:0,anchorY:0,anchorZ:0,targetAnchorX:0,targetAnchorY:0,targetAnchorZ:0,axisX:0,axisY:1,axisZ:0,limitsEnabled:false,minAngle:-90,maxAngle:90});
export const characterBody3d=o=>!!(o?.playable3d||o?.controller3d||o?.type==='player'||o?.type==='character');
export function colliderGeometry3d(o){
 const c=o.collider3d||{},w=positive(c.width,Math.max(.015625,n(o.w,32)/64)),h=positive(c.height,Math.max(.015625,n(o.h,32)/64)),d=positive(c.depth,Math.max(.015625,n(o.depth3d,o.h||32)/64));
 const shape=['box','capsule','sphere'].includes(c.shape)?c.shape:characterBody3d(o)?'capsule':'box',radius=Math.max(.005,Math.min(positive(c.radius,Math.min(w,d,h)/2),shape==='capsule'?h/2:10000));
 return {shape,w,h,d,radius,halfHeight:Math.max(0,h/2-radius),offset:{x:n(c.offsetX),y:n(c.offsetY),z:n(c.offsetZ)}};
}
export function rotationQuaternion3d(o){
 const x=n(o.rotationX3d)*Math.PI/360,y=-n(o.rotation)*Math.PI/360,z=n(o.rotationZ3d)*Math.PI/360;
 const a=Math.sin(x),b=Math.sin(y),c=Math.sin(z),A=Math.cos(x),B=Math.cos(y),C=Math.cos(z);
 // Y * X * Z, matching the renderer's existing clockwise yaw convention.
 return {x:B*a*C+b*A*c,y:b*A*C-B*a*c,z:B*A*c-b*a*C,w:B*A*C+b*a*c};
}
export function quaternionEuler3d(q){
 const m13=2*(q.x*q.z+q.w*q.y),m23=2*(q.y*q.z-q.w*q.x),m33=1-2*(q.x*q.x+q.y*q.y),m21=2*(q.x*q.y+q.w*q.z),m22=1-2*(q.x*q.x+q.z*q.z);
 return {rotationX3d:Math.asin(-Math.max(-1,Math.min(1,m23)))*180/Math.PI,rotation:-Math.atan2(m13,m33)*180/Math.PI,rotationZ3d:Math.atan2(m21,m22)*180/Math.PI};
}
export const colliderPosition3d=(o,g=colliderGeometry3d(o))=>({x:n(o.x)/64+n(o.w,32)/128,y:n(o.elevation3d)+n(o.h,32)/128,z:n(o.y)/64+n(o.depth3d,o.h||32)/128});
