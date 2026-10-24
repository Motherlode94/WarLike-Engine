// Generated-compatible runtime equivalent of types/systems.ts.
// Regenerate with: npm run build:types (writes js/typed/).
export const clamp=(value,min,max)=>Math.min(max,Math.max(min,value));
export function distance(a,b){return Math.hypot(a.x-b.x,a.y-b.y)}
export function overlapAabb(a,b){return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y}
export function collisionCircleRect(cx,cy,r,rect){
 const x=clamp(cx,rect.x,rect.x+rect.w),y=clamp(cy,rect.y,rect.y+rect.h);
 return (cx-x)**2+(cy-y)**2<r*r;
}
export function sanitizeVehicle(input){
 const bounded=(n,fallback,min,max)=>Number.isFinite(n)?clamp(n,min,max):fallback;
 return {maxSpeed:bounded(input.maxSpeed,250,40,3000),
 acceleration:bounded(input.acceleration,210,10,5000),
 brakeForce:bounded(input.brakeForce,310,10,5000),
 turnRate:bounded(input.turnRate,140,15,1080),
 drag:bounded(input.drag,1.4,0,30),
 collisionRadius:bounded(input.collisionRadius,25,4,500)};
}
export function validateScene(data){
 if(!data||typeof data!=='object')return false;
 if(!Array.isArray(data.entities)||data.entities.length>10000)return false;
 if(!data.camera||![data.camera.x,data.camera.y,data.camera.zoom].every(Number.isFinite)||data.camera.zoom<=0)return false;
 const ids=new Set();
 for(const entity of data.entities){
  if(!entity||!Number.isSafeInteger(entity.id)||entity.id<1||ids.has(entity.id))return false;
  ids.add(entity.id);
  if(typeof entity.name!=='string'||entity.name.length>100||!['player','object','character','prefab'].includes(entity.type))return false;
  if(![entity.x,entity.y,entity.w,entity.h].every(Number.isFinite)||entity.w<=0||entity.h<=0)return false;
  if(!/^#[0-9a-f]{6}$/i.test(entity.color))return false;
 }
 return true;
}
