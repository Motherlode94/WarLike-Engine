import {solidBody3d} from './collision-3d.js';
import {solidCollider2d,colliderRect2d} from './physics-2d.js';

const number=(v,d=0)=>Number.isFinite(Number(v))?Number(v):d;
export const survivalPlacement={active:false,recipe:null,point:null,rotation:0,snap:true,entity:null,valid:false,message:'',actorId:null};
export function clearSurvivalPlacement(){Object.assign(survivalPlacement,{active:false,recipe:null,point:null,entity:null,valid:false,message:'',actorId:null})}
export const survivalBuildLimit=entities=>entities.some(o=>o._netPeerId)?253+Math.min(3,entities.filter(o=>o.coopSeat||o._netRemote).length):256;
export const survivalCenter=(o,mode)=>({x:number(o.x)+number(o.w)/2,y:number(o.y)+number(mode==='3d'?o.depth3d:o.h,number(o.h))/2});

// Conservative rotated footprints keep both visual models and characters clear.
function footprint(o,mode){
 const c=survivalCenter(o,mode),angle=number(o.rotation)*Math.PI/180,w=Math.max(1,number(o.w,32)),d=Math.max(1,number(mode==='3d'?o.depth3d:o.h,number(o.h,32)));
 const box={x:c.x,y:c.y,w:Math.abs(Math.cos(angle))*w+Math.abs(Math.sin(angle))*d,d:Math.abs(Math.sin(angle))*w+Math.abs(Math.cos(angle))*d,z:number(o.elevation3d)*64,h:Math.max(1,number(o.h,32))};
 if(mode==='2d'&&o.collider2d?.enabled!==false&&o.collider2d){const r=colliderRect2d(o),left=Math.min(box.x-box.w/2,r.x),right=Math.max(box.x+box.w/2,r.x+r.w),top=Math.min(box.y-box.d/2,r.y),bottom=Math.max(box.y+box.d/2,r.y+r.h);box.x=(left+right)/2;box.y=(top+bottom)/2;box.w=right-left;box.d=bottom-top}
 return box;
}
export function inspectSurvivalPlacement(actor,template,point,entities,{mode='2d',snap=false}={}){
 const fail=message=>({ok:false,message,entity:null});
 if(!['2d','3d'].includes(mode)||!template)return fail('Prefab de construction à configurer.');
 if(!point||!['x','y'].every(k=>typeof point[k]==='number'&&Number.isFinite(point[k])&&Math.abs(point[k])<=1000000)||point.rotation!=null&&(typeof point.rotation!=='number'||!Number.isFinite(point.rotation)))return fail('Vise un emplacement au sol.');
 const grid=mode==='3d'?32:16,x=snap?Math.round(point.x/grid)*grid:point.x,y=snap?Math.round(point.y/grid)*grid:point.y;
 const entity={...structuredClone(template),x:x-number(template.w)/2,y:y-number(mode==='3d'?template.depth3d:template.h,number(template.h))/2,elevation3d:0,rotation:((number(point.rotation)%360)+360)%360};
 const invalid=message=>({ok:false,message,entity}),a=survivalCenter(actor,mode);
 if(Math.hypot(x-a.x,y-a.y)>300)return invalid('Trop loin · rapproche-toi (portée 300).');
 if(mode==='3d'&&Math.abs(number(actor.elevation3d))>.4)return invalid('Rejoins le sol pour construire.');
 if(entities.length>=survivalBuildLimit(entities))return invalid('Limite de construction atteinte · places coop réservées.');
 const b=footprint(entity,mode);
 const blocked=entities.some(o=>{
  if(o.visible===false||o.sequenceEnabled===false||o._sequenceDestroyed||o._modeEliminated||o.survivalDormant)return false;
  if(!(o.survival||o.ai||o.type==='player'||o.type==='character'||['campfire','shelter'].includes(o.survivalNode?.kind)||(mode==='3d'?solidBody3d(o):solidCollider2d(o))))return false;
  const c=footprint(o,mode);
  return Math.abs(b.x-c.x)<(b.w+c.w)/2+4&&Math.abs(b.y-c.y)<(b.d+c.d)/2+4&&(mode!=='3d'||b.z<c.z+c.h&&b.z+b.h>c.z);
 });
 return blocked?invalid('Emplacement occupé · éloigne l’aperçu des obstacles et joueurs.'):{ok:true,message:'Emplacement libre · clic gauche ou Poser pour confirmer.',entity};
}
