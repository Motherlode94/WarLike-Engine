// Physics dimensions are meters; scene positions and visual sizes use 64 px/m.
const n=(v,d=0)=>Number.isFinite(Number(v))?Number(v):d;
const positive=(v,d)=>n(v)>0?n(v):d;
export const defaultCollider3d=()=>({enabled:true,shape:'box',width:0,height:0,depth:0,radius:0,offsetX:0,offsetY:0,offsetZ:0});
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

/**
 * Exact convex hull for an affine-transformed BoxCollider.
 * Eight corners of an affine box still define a convex parallelepiped.
 * Output vertices are in rigid-body-local coordinates, in metres; Rapier
 * handles the body's rotation/translation independently.
 * This is exact for BoxCollider volumes, NOT for arbitrary concave GLB meshes.
 */
export function affineBoxHull3d(correction,geometry,bodyPosition,bodyRotation){
 if(!Array.isArray(correction)||correction.length!==16||!correction.every(Number.isFinite))throw Error('Matrice affine de collider invalide.');
 const g=geometry,p=bodyPosition,q=bodyRotation;
 const dims=[g.w,g.h,g.d];
 if(dims.some(v=>!Number.isFinite(v)||v<=1e-7))throw Error('BoxCollider dégénéré.');
 if(![p.x,p.y,p.z,q.x,q.y,q.z,q.w].every(Number.isFinite))throw Error('Pose du Rigidbody invalide.');
 const norm=Math.hypot(q.x,q.y,q.z,q.w);
 if(norm<1e-9)throw Error('Rotation du Rigidbody invalide.');
 const rot={x:q.x/norm,y:q.y/norm,z:q.z/norm,w:q.w/norm};
 const rotate=(v,r)=>{
  const ux=r.x,uy=r.y,uz=r.z,w=r.w;
  const tx=2*(uy*v.z-uz*v.y),ty=2*(uz*v.x-ux*v.z),tz=2*(ux*v.y-uy*v.x);
  return {x:v.x+w*tx+uy*tz-uz*ty,y:v.y+w*ty+uz*tx-ux*tz,z:v.z+w*tz+ux*ty-uy*tx};
 };
 const offset=g.offset||{x:0,y:0,z:0};
 const points=new Float32Array(24);
 let index=0;
 for(const sx of [-1,1])for(const sy of [-1,1])for(const sz of [-1,1]){
  const local={x:sx*g.w/2+offset.x,y:sy*g.h/2+offset.y,z:sz*g.d/2+offset.z};
  const relative=rotate(local,rot);
  const world={x:p.x+relative.x,y:p.y+relative.y,z:p.z+relative.z};
  const transformed={
   x:correction[0]*world.x+correction[4]*world.y+correction[8]*world.z+correction[12],
   y:correction[1]*world.x+correction[5]*world.y+correction[9]*world.z+correction[13],
   z:correction[2]*world.x+correction[6]*world.y+correction[10]*world.z+correction[14]
  };
  const inverse=rotate({x:transformed.x-p.x,y:transformed.y-p.y,z:transformed.z-p.z},{x:-rot.x,y:-rot.y,z:-rot.z,w:rot.w});
  points[index++]=inverse.x;points[index++]=inverse.y;points[index++]=inverse.z;
 }
 const axis=(c)=>[points[c]-points[0],points[c+1]-points[1],points[c+2]-points[2]];
 const a=axis(12),b=axis(6),c=axis(3);
 const cross=[b[1]*c[2]-b[2]*c[1],b[2]*c[0]-b[0]*c[2],b[0]*c[1]-b[1]*c[0]];
 const volume=Math.abs(a[0]*cross[0]+a[1]*cross[1]+a[2]*cross[2]);
 if(!Number.isFinite(volume)||volume<1e-8)throw Error('Collider affine non inversible ou de volume nul.');
 return points;
}
export const affineHullSignature3d=points=>Array.from(points,n=>Math.round(n*1e5)).join(',');
