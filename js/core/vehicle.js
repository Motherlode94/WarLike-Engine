import {housingActive,housing} from './housing.js';
import {isBuildingSolid} from './building-system.js';
import {sanitizeVehicle,collisionCircleRect} from '../typed/systems.js';
import {state} from './state.js';
import {getAsset} from '../assets/catalog.js';
export const driving={vehicleId:null,speed:0,steer:0,enterHeld:false,collisionFlash:0,transition:null};
const vehicle=o=>o?.type==='prefab'&&getAsset(o.assetId)?.category==='Vehicles';
const center=o=>({x:o.x+o.w/2,y:o.y+o.h/2});
export function vehicleDefaults(o){return sanitizeVehicle({maxSpeed:o.maxSpeed,acceleration:o.acceleration,brakeForce:o.brakeForce,turnRate:o.turnRate,drag:o.drag,collisionRadius:o.collisionRadius})}
export function resetDriving(){Object.assign(driving,{vehicleId:null,speed:0,steer:0,enterHeld:false,collisionFlash:0,transition:null})}
export function currentVehicle(){return state.entities.find(o=>o.id===driving.vehicleId&&vehicle(o))||null}
const solid=o=>isBuildingSolid(o)||o.type==='object'||o.type==='prefab'&&getAsset(o.assetId)?.category==='Props'&&['crate','barrel','wall','sandbag','fence','rock'].includes(o.assetId);
const overlapCircleRect=collisionCircleRect;
export function updateVehicles(dt,player){
 driving.collisionFlash=Math.max(0,driving.collisionFlash-dt);
 const k=state.keys,pressed=k.has('e')&&!housingActive()&&housing.transition===0;
 if(driving.transition){const action=driving.transition;action.remaining-=dt;if(action.remaining<=0){if(action.type==='enter'){driving.vehicleId=action.carId;driving.speed=0;player._hiddenInVehicle=true;player.animation='drive';}else{player.x=action.x;player.y=action.y;player._hiddenInVehicle=false;driving.vehicleId=null;driving.speed=0;player.animation='exit_vehicle';player._actionAnimationUntil=performance.now()/1000+.45}driving.transition=null;player._vehicleTransition=false}else{player._vehicleTransition=true;player.animation=action.type==='enter'?'enter_vehicle':'exit_vehicle';driving.enterHeld=pressed;return}}

 if(pressed&&!driving.enterHeld&&player){
  if(currentVehicle()){
   const car=currentVehicle(),c=center(car),a=(car.rotation||0)*Math.PI/180;const candidate=[{x:c.x-Math.sin(a)*((car.w+player.w)*.55),y:c.y+Math.cos(a)*((car.h+player.h)*.55)},{x:c.x+Math.sin(a)*((car.w+player.w)*.55),y:c.y-Math.cos(a)*((car.h+player.h)*.55)}];
   const exit=candidate.find(p=>!state.entities.some(o=>o!==player&&o!==car&&solid(o)&&overlapCircleRect(p.x,p.y,player.w*.4,o)));
   if(exit){driving.transition={type:'exit',x:exit.x-player.w/2,y:exit.y-player.h/2,remaining:.38};player.animation='exit_vehicle';player._vehicleTransition=true;driving.enterHeld=pressed;return}
  }else{
   const pc=center(player);const nearest=state.entities.filter(vehicle).map(o=>({o,d:Math.hypot(center(o).x-pc.x,center(o).y-pc.y)})).sort((a,b)=>a.d-b.d)[0];
   if(nearest&&nearest.d<Math.max(115,(nearest.o.w+player.w)*.7)){driving.transition={type:'enter',carId:nearest.o.id,remaining:.42};player.animation='enter_vehicle';player._vehicleTransition=true;driving.enterHeld=pressed;return}
  }
 }
 driving.enterHeld=pressed;
 const car=currentVehicle();if(!car||!player)return;
 const conf=vehicleDefaults(car),throttle=Number(k.has('w')||k.has('z')||k.has('arrowup'))-Number(k.has('s')||k.has('arrowdown')),turn=Number(k.has('d')||k.has('arrowright'))-Number(k.has('q')||k.has('a')||k.has('arrowleft')),handbrake=k.has(' ');
 const oldSpeed=driving.speed;
 if(throttle!==0){const same=Math.sign(throttle)===Math.sign(driving.speed)||Math.abs(driving.speed)<1;driving.speed+=throttle*(same?conf.acceleration:conf.brakeForce)*dt}
 else{const decel=Math.min(Math.abs(driving.speed),Math.max(8,Math.abs(driving.speed)*conf.drag)*dt);driving.speed-=Math.sign(driving.speed)*decel}
 if(handbrake)driving.speed*=Math.max(0,1-5*dt);
 driving.speed=Math.max(-conf.maxSpeed*.48,Math.min(conf.maxSpeed,driving.speed));
 const steerScale=Math.min(1,Math.abs(driving.speed)/75);car.rotation=(car.rotation||0)+turn*conf.turnRate*steerScale*Math.sign(driving.speed||1)*dt*(handbrake?1.35:1);
 const angle=(car.rotation||0)*Math.PI/180;
 const beforeX=car.x,beforeY=car.y;car.x+=Math.sin(angle)*driving.speed*dt;car.y-=Math.cos(angle)*driving.speed*dt;
 const centerPoint=center(car),r=conf.collisionRadius;
 if(state.entities.some(o=>o!==car&&o!==player&&solid(o)&&overlapCircleRect(centerPoint.x,centerPoint.y,r,o))){
  car.x=beforeX;car.y=beforeY;driving.speed=-oldSpeed*.12;driving.collisionFlash=.2;
 }
 car.animation=handbrake&&Math.abs(driving.speed)>8?'brake':Math.abs(driving.speed)<3?'idle':turn>0?'turn_right':turn<0?'turn_left':driving.speed<0?'reverse':'drive';
 car.animationSpeed=Math.max(.6,Math.min(2.5,Math.abs(driving.speed)/140));
 player.x=car.x+(car.w-player.w)/2;player.y=car.y+(car.h-player.h)/2;player._hiddenInVehicle=true;player.animation='drive';
}
export function drawDrivingHud(ctx,w,h,player){
 if(!state.playing||!player)return;const car=currentVehicle();
 ctx.save();ctx.font='12px system-ui';ctx.fillStyle='#ddf3fb';
 if(car){
  ctx.fillStyle='#101b28e9';ctx.fillRect(w-200,16,184,99);
  ctx.fillStyle='#61e3c3';ctx.font='bold 13px system-ui';ctx.fillText('VEHICLE CONTROLLER',w-190,36);
  ctx.font='12px system-ui';ctx.fillStyle='#dce9f4';ctx.fillText(car.name,w-190,55);
  ctx.font='bold 20px system-ui';ctx.fillText(Math.round(Math.abs(driving.speed)*.36)+' km/h',w-190,83);
  ctx.font='10px system-ui';ctx.fillText('ZQSD tourner · E sortir · Espace frein',w-190,103);
  if(driving.collisionFlash>0){ctx.strokeStyle='#ef7d5c';ctx.lineWidth=3;ctx.strokeRect(w-200,16,184,99)}
 }else{
  const pc=center(player),nearest=state.entities.filter(vehicle).map(o=>({o,d:Math.hypot(center(o).x-pc.x,center(o).y-pc.y)})).sort((a,b)=>a.d-b.d)[0];
  if(nearest?.d<Math.max(115,(nearest.o.w+player.w)*.7)){ctx.fillStyle='#172d37e8';ctx.fillRect(w/2-115,h-88,230,28);ctx.fillStyle='#acfce0';ctx.textAlign='center';ctx.fillText('E — Entrer dans '+nearest.o.name,w/2,h-69)}
 }
 ctx.restore();
}
