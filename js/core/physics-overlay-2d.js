import {colliderShape2d} from './collider-shapes-2d.js';
import {jointAnchor2d} from './physics-tools-2d.js';
export function drawPhysicsOverlay2d(ctx,object,entities,zoom=1){
 const s=colliderShape2d(object),scale=Math.max(.01,zoom);
 ctx.save();ctx.strokeStyle=object.collider2d?.isTrigger?'#ffc66c':'#56ed82';ctx.lineWidth=1/scale;ctx.setLineDash([5/scale,3/scale]);
 ctx.beginPath();
 if(s.r){
  ctx.moveTo(s.x+s.r,s.y);ctx.lineTo(s.x+s.w-s.r,s.y);ctx.arcTo(s.x+s.w,s.y,s.x+s.w,s.y+s.r,s.r);
  ctx.lineTo(s.x+s.w,s.y+s.h-s.r);ctx.arcTo(s.x+s.w,s.y+s.h,s.x+s.w-s.r,s.y+s.h,s.r);
  ctx.lineTo(s.x+s.r,s.y+s.h);ctx.arcTo(s.x,s.y+s.h,s.x,s.y+s.h-s.r,s.r);
  ctx.lineTo(s.x,s.y+s.r);ctx.arcTo(s.x,s.y,s.x+s.r,s.y,s.r);ctx.closePath();
 }else ctx.rect(s.x,s.y,s.w,s.h);
 ctx.stroke();ctx.setLineDash([]);
 const rb=object.rigidbody2d;
 if(rb?.enabled){
  const vx=Number.isFinite(rb.vx)?rb.vx:0,vy=Number.isFinite(rb.vy)?rb.vy:0;
  ctx.strokeStyle='#85caff';ctx.beginPath();ctx.moveTo(s.cx,s.cy);ctx.lineTo(s.cx+vx*.15,s.cy+vy*.15);ctx.stroke();
 }
 const anchor=jointAnchor2d(object,entities);
 if(anchor){ctx.strokeStyle='#d4a0ff';ctx.beginPath();ctx.moveTo(s.cx+(Number(object.joint2d.offsetX)||0),s.cy+(Number(object.joint2d.offsetY)||0));ctx.lineTo(anchor.x,anchor.y);ctx.stroke();ctx.beginPath();ctx.arc(anchor.x,anchor.y,4/scale,0,Math.PI*2);ctx.stroke()}
 ctx.restore();
}
