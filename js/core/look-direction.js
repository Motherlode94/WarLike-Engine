// Shared directional targeting helpers for playable actors.
// 2D image coordinates: +x right, +y down. 3D ground: rotation 0 points -Z.
const unit=(x,y)=>{const length=Math.hypot(x,y);return length>1e-7?{x:x/length,y:y/length}:null};
export function facingVector2d(actor){
 if(actor?.lookDirection2d&&Number.isFinite(actor.lookDirection2d.x)&&Number.isFinite(actor.lookDirection2d.y)){
  const direct=unit(actor.lookDirection2d.x,actor.lookDirection2d.y);if(direct)return direct;
 }
 switch(actor?.facing2d){
  case 'left':return {x:-1,y:0};
  case 'up':return {x:0,y:-1};
  case 'down':return {x:0,y:1};
  case 'right':return {x:1,y:0};
  default:return {x:actor?.flipX?-1:1,y:0};
 }
}
export function aimActor2d(actor,target){
 const center={x:(Number(actor.x)||0)+(Number(actor.w)||0)/2,y:(Number(actor.y)||0)+(Number(actor.h)||0)/2};
 const vector=target&&Number.isFinite(target.x)&&Number.isFinite(target.y)?unit(target.x-center.x,target.y-center.y):null;
 const heading=vector||facingVector2d(actor);
 actor.lookDirection2d=heading;
 actor.facing2d=Math.abs(heading.x)>=Math.abs(heading.y)?heading.x<0?'left':'right':heading.y<0?'up':'down';
 actor.flipX=heading.x<-.00001?true:heading.x>.00001?false:!!actor.flipX;
 return heading;
}
export function facingVector3d(actor){
 const yaw=(Number(actor?.rotation)||0)*Math.PI/180;
 return {x:Math.sin(yaw),y:-Math.cos(yaw)};
}
export function targetInFacingArc3d(actor,target,arcRadians=1.2){
 if(!actor||!target)return false;
 const fromX=(Number(actor.x)||0)+(Number(actor.w)||0)/2;
 const fromY=(Number(actor.y)||0)+(Number(actor.depth3d??actor.h)||0)/2;
 const toX=(Number(target.x)||0)+(Number(target.w)||0)/2-fromX;
 const toY=(Number(target.y)||0)+(Number(target.depth3d??target.h)||0)/2-fromY;
 const direction=unit(toX,toY);
 if(!direction)return true;
 const forward=facingVector3d(actor);
 const cone=Math.max(0,Math.min(Math.PI*2,Number(arcRadians)||0));
 return direction.x*forward.x+direction.y*forward.y>=Math.cos(cone/2)-1e-7;
}
