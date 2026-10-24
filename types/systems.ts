import type {GameEntity,SceneFile,VehiclePhysics,Vector2D} from './engine.js';

/** Pure deterministic math, shared contract with Unity's C# bridge. No browser APIs. */
export const clamp=(value:number,min:number,max:number):number=>Math.min(max,Math.max(min,value));
export function distance(a:Vector2D,b:Vector2D):number {return Math.hypot(a.x-b.x,a.y-b.y)}
export function overlapAabb(a:Pick<GameEntity,'x'|'y'|'w'|'h'>,b:Pick<GameEntity,'x'|'y'|'w'|'h'>):boolean{
 return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
}
export function collisionCircleRect(cx:number,cy:number,r:number,rect:Pick<GameEntity,'x'|'y'|'w'|'h'>):boolean {
 const x=clamp(cx,rect.x,rect.x+rect.w),y=clamp(cy,rect.y,rect.y+rect.h);
 return (cx-x)**2+(cy-y)**2<r*r;
}
export function sanitizeVehicle(input:Partial<VehiclePhysics>):VehiclePhysics {
 const bounded=(n:number|undefined,fallback:number,min:number,max:number)=>Number.isFinite(n)?clamp(n!,min,max):fallback;
 return {
 maxSpeed:bounded(input.maxSpeed,250,40,3000),
 acceleration:bounded(input.acceleration,210,10,5000),
 brakeForce:bounded(input.brakeForce,310,10,5000),
 turnRate:bounded(input.turnRate,140,15,1080),
 drag:bounded(input.drag,1.4,0,30),
 collisionRadius:bounded(input.collisionRadius,25,4,500)
 };
}
export function validateScene(data:unknown):data is SceneFile {
 if(!data||typeof data!=='object')return false;
 const scene=data as Partial<SceneFile>;
 if(!Array.isArray(scene.entities)||scene.entities.length>10000)return false;
 if(!scene.camera||!Number.isFinite(scene.camera.x)||!Number.isFinite(scene.camera.y)||!Number.isFinite(scene.camera.zoom)||scene.camera.zoom<=0)return false;
 const ids=new Set<number>();
 for(const entity of scene.entities){
  if(!entity||!Number.isSafeInteger(entity.id)||entity.id<1||ids.has(entity.id))return false;
  ids.add(entity.id);
  if(typeof entity.name!=='string'||entity.name.length>100||!['player','object','character','prefab'].includes(entity.type))return false;
  if(![entity.x,entity.y,entity.w,entity.h].every(Number.isFinite)||entity.w<=0||entity.h<=0)return false;
  if(!/^#[0-9a-f]{6}$/i.test(entity.color))return false;
 }
 return true;
}
