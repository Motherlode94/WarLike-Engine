import {interactionCenter} from './interaction-range.js';

// Scene data supplies destinations; guidance never completes or unlocks a goal.
export function demoGuidance(actor,entities,objectives,{mode='2d'}={}){
 const demo=actor?.adventure?.demo||actor?.controller2d?.demo;
 const goal=Object.values(objectives).find(o=>o.status==='active');
 if(!goal||!demo?.steps)return '';
 const step=demo.steps.find(s=>s.goal===goal.id||objectives[s.goal]===goal);
 if(!step)return '';
 const origin=interactionCenter(actor,mode),ids=step.targetIds||[step.targetId];
 const candidates=entities.filter(o=>ids.includes(o.id)&&o.visible!==false&&o.enabled!==false&&!o._sequenceDestroyed);
 candidates.sort((a,b)=>{const ca=interactionCenter(a,mode),cb=interactionCenter(b,mode);return Math.hypot(ca.x-origin.x,ca.y-origin.y)-Math.hypot(cb.x-origin.x,cb.y-origin.y)});
 const target=candidates[0];if(!target)return '';
 const at=interactionCenter(target,mode),dx=at.x-origin.x,dy=at.y-origin.y;
 const direction=Math.hypot(dx,dy)<50?'À proximité':Math.abs(dx)>Math.abs(dy)?(dx>0?'À droite':'À gauche'):(dy>0?'En bas':'En haut');
 // 3D uses a rotating camera: screen-relative arrows would be misleading.
 return mode==='3d'?'Destination : '+target.name:direction+' · '+target.name;
}
