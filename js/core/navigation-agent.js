// A reusable waypoint navigation component for 2D/3D entities.
// Local collision-constrained steering; NOT a baked NavMesh or a global pathfinder.
import {moveBody2d} from './physics-2d.js';
import {moveBody3d} from './collision-3d.js';
const finite=n=>typeof n==='number'&&Number.isFinite(n);
export const defaultNavigationAgent=()=>({enabled:true,speed:2,stoppingDistance:.2,loop:true,waypoints:[],targetId:0});
export function inspectNavigationAgent(agent){
 if(!agent||typeof agent!=='object'||Array.isArray(agent))return ['Navigation Agent : configuration invalide.'];
 const errors=[];
 if(!finite(agent.speed)||agent.speed<0||agent.speed>60||!finite(agent.stoppingDistance)||agent.stoppingDistance<0||agent.stoppingDistance>50)errors.push('Navigation Agent : vitesse ou distance invalide.');
 if(!Array.isArray(agent.waypoints)||agent.waypoints.length>64||agent.waypoints.some(p=>!p||!finite(p.x)||!finite(p.y)))errors.push('Navigation Agent : points de passage invalides.');
 if(agent.targetId!=null&&(!Number.isSafeInteger(agent.targetId)||agent.targetId<0))errors.push('Navigation Agent : cible invalide.');
 return errors;
}
export function stepNavigationAgents(entities,dt,{mode='3d'}={}){
 if(!Array.isArray(entities)||!Number.isFinite(dt)||dt<=0)return 0;
 const frame=Math.max(0,Math.min(.1,dt));let moved=0;
 for(const o of entities){
  const cfg=o?.navigationAgent;
  if(!cfg||cfg.enabled===false||o.enabled===false||o.sequenceEnabled===false||o._sequenceDestroyed||o.ai?.enabled||inspectNavigationAgent(cfg).length)continue;
  const runtime=o._navigationState??={index:0};
  const target=cfg.targetId>0?entities.find(e=>e.id===cfg.targetId&&e!==o&&e.enabled!==false):null;
  let destination=target?{x:target.x,y:target.y}:cfg.waypoints[runtime.index]||null;
  if(!destination){runtime.speed=0;runtime.status='idle';continue}
  let dx=destination.x-o.x,dy=destination.y-o.y,distance=Math.hypot(dx,dy);
  if(!target&&distance<=cfg.stoppingDistance*64){
   runtime.index+=1;
   if(runtime.index>=cfg.waypoints.length)runtime.index=cfg.loop?0:cfg.waypoints.length;
   destination=cfg.waypoints[runtime.index]||null;
   if(!destination){runtime.speed=0;runtime.status='arrived';continue}
   dx=destination.x-o.x;dy=destination.y-o.y;distance=Math.hypot(dx,dy);
  }
  const step=Math.min(Math.max(0,distance-cfg.stoppingDistance*64),cfg.speed*64*frame);
  if(step<=0||distance<1e-6){runtime.speed=0;runtime.status='idle';continue}
  const beforeX=o.x,beforeY=o.y;
  if(mode==='2d')moveBody2d(o,dx/distance*step,dy/distance*step,entities);
  else moveBody3d(o,dx/distance*step,dy/distance*step,0,entities,{recover:false});
  const actual=Math.hypot(o.x-beforeX,o.y-beforeY);
  runtime.speed=actual/(frame*64);
  runtime.status=actual>1e-5?'moving':'blocked';
  if(actual>1e-5){
   o.rotation=Math.atan2(o.x-beforeX,-(o.y-beforeY))*180/Math.PI;
   if(o.animalController?.enabled){
    o.animation=o.animalController.animationWalk||'walk';
   }else o.animation='walk';
   moved++;
  } else if(o.animalController?.enabled)o.animation=o.animalController.animationIdle||'idle';
  o.animatorParameters={...o.animatorParameters,navigationSpeed:runtime.speed,navigationMoving:actual>1e-5};
 }
 return moved;
}
