// Modular 2D/3D wildlife locomotion built on the engine's collision solvers.
// No prefabs or generated assets. No behavior when component is absent.
import {moveBody2d} from './physics-2d.js';
import {moveBody3d} from './collision-3d.js';
const n=(v,d=0)=>Number.isFinite(v)?v:d;
const clamp=(v,low,high)=>Math.min(high,Math.max(low,v));
export const defaultAnimalController=()=>({
 enabled:true,behavior:'wander',walkSpeed:1.4,runSpeed:4.5,
 perceptionRadius:5,fleeDistance:7,roamRadius:4,restSeconds:2,
 targetId:0,animationIdle:'idle',animationWalk:'walk',animationRun:'run'
});
export function inspectAnimalController(config){
 if(!config||typeof config!=='object'||Array.isArray(config))return ['Animal Controller : configuration invalide.'];
 const errors=[];
 if(!['idle','wander','flee'].includes(config.behavior))errors.push('Animal Controller : comportement inconnu.');
 for(const key of ['walkSpeed','runSpeed','perceptionRadius','fleeDistance','roamRadius','restSeconds']){
  if(!Number.isFinite(config[key])||config[key]<0||config[key]>100)errors.push('Animal Controller : valeur invalide pour '+key);
 }
 for(const key of ['animationIdle','animationWalk','animationRun'])if(typeof config[key]!=='string'||config[key].length>100)errors.push('Animal Controller : animation invalide pour '+key);
 if(config.targetId!=null&&(!Number.isSafeInteger(config.targetId)||config.targetId<0))errors.push('Animal Controller : cible invalide.');
 return errors;
}
const pos=e=>({x:n(e.x)+(n(e.w,32)/2),y:n(e.y)+(n(e.depth3d,e.h||32)/2)});
export function stepAnimalControllers(entities,dt,{mode='3d'}={}){
 if(!Array.isArray(entities)||!Number.isFinite(dt)||dt<=0)return 0;
 const frame=clamp(dt,0,.1);let moved=0;
 for(const animal of entities){
  const cfg=animal?.animalController;
  if(!cfg||cfg.enabled===false||animal.enabled===false||animal.sequenceEnabled===false||animal._sequenceDestroyed||inspectAnimalController(cfg).length)continue;
  // Do not compete with the combat/targeting AI controller.
  if(animal.ai?.enabled)continue;
  const state=animal._animalMotion??={clock:0,originX:n(animal.x),originY:n(animal.y)};
  state.clock+=frame;
  const current=pos(animal),targets=entities.filter(e=>e!==animal&&e.enabled!==false&&e.id===cfg.targetId);
  const target=targets[0],threat=target?pos(target):null;
  const distance=threat?Math.hypot(threat.x-current.x,threat.y-current.y):Infinity;
  const flee=cfg.behavior==='flee'&&threat&&distance<cfg.perceptionRadius*64;
  let vx=0,vy=0,speed=0;
  if(flee){
   vx=current.x-threat.x;vy=current.y-threat.y;speed=cfg.runSpeed*64;
   if(Math.hypot(vx,vy)<1e-4){vx=1;vy=0}
  }else if(cfg.behavior!=='idle'){
   // Repeatable orbit around original location; never teleports or uses random state.
   const angle=state.clock*.45+(n(animal.id)%17)*.37, radius=cfg.roamRadius*64;
   const tx=state.originX+Math.sin(angle)*radius,ty=state.originY+Math.cos(angle)*radius;
   vx=tx-n(animal.x);vy=ty-n(animal.y);speed=cfg.walkSpeed*64;
   if(Math.hypot(vx,vy)<6){vx=0;vy=0}
  }
  const length=Math.hypot(vx,vy),step=Math.min(length,speed*frame);
  if(step>0){
   const dx=vx/length*step,dy=vy/length*step;
   const beforeX=animal.x,beforeY=animal.y;
   if(mode==='2d')moveBody2d(animal,dx,dy,entities);
   else moveBody3d(animal,dx,dy,0,entities,{recover:false});
   const actual=Math.hypot(animal.x-beforeX,animal.y-beforeY);
   speed=frame>0?actual/frame/64:0;
   if(actual>1e-5){animal.rotation=Math.atan2(animal.x-beforeX,-(animal.y-beforeY))*180/Math.PI;moved++}
   else speed=0;
  }else speed=0;
  state.status=speed>0?(flee?'flee':'wander'):'idle';
  const animation=speed>0?(flee?cfg.animationRun:cfg.animationWalk):cfg.animationIdle;
  animal.animation=animation;
  // Animator can use these parameters; the original graph stays on the object.
  animal.animatorParameters={...animal.animatorParameters,animalSpeed:speed,animalMoving:speed>0,animalFleeing:!!flee&&speed>0};
 }
 return moved;
}
