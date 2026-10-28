import {stepHeroFlight} from './hero-movement.js';
import {controllerMode2d,walkPlatformer2d,moveBody2d} from './physics-2d.js';
import {faceMovement2d} from './character-facing.js';
import {followCamera2d} from './play-camera.js';
import {playSound} from './audio.js';
// WarLike 2D foot controller with solid collisions and an optional chase camera.
import {state} from './state.js';
export const motion={cameraFollow:false,cameraInitialized:false,footSpeed:190,sprintMultiplier:1.55};
export function walkPlayer(player,dt,keys=state.keys,{pressedKeys=state.keyPresses}={}){
 if(player._vehicleTransition||player._actionAnimationUntil>performance.now()/1000)return {moving:false,sprinting:false};
 if(player.superhero?.enabled!==false&&player.heroState?.flight){stepHeroFlight(player,keys,dt,state.entities,'2d');return {moving:true,sprinting:keys.has('shift')}}
 if(controllerMode2d(player,state.entities)==='platformer'){const beforeX=player.x,beforeY=player.y,result=walkPlatformer2d(player,dt,keys,state.entities,{pressedKeys});faceMovement2d(player,player.x-beforeX,player.y-beforeY);if(!player._ninjaAttackUntil)player.animation=player.grounded2d?(result.moving?(result.sprinting?'run':'walk'):'idle'):(player.rigidbody2d.vy<0?'jump':'fall');return result}
 const x=Number(keys.has('arrowright')||keys.has('d'))-Number(keys.has('arrowleft')||keys.has('a')||keys.has('q'));
 const y=Number(keys.has('arrowdown')||keys.has('s'))-Number(keys.has('arrowup')||keys.has('w')||keys.has('z'));
 const length=Math.hypot(x,y);const sprint=keys.has('shift')&&length>0;
 const configured=Number(sprint?player.controller2d?.sprintSpeed:player.controller2d?.walkSpeed);const speed=player.controller2d?Math.max(0,Number.isFinite(configured)?configured:motion.footSpeed):Math.max(10,Number(player.footSpeed)||motion.footSpeed)*(sprint?motion.sprintMultiplier:1);
 const fatigue=player.survival?.enabled!==false&&player.survival&&player.survivalState?.rest<15?.6:1,dx=length?x/length*speed*dt*fatigue:0,dy=length?y/length*speed*dt*fatigue:0;if(length)playSound('step',{cooldown:sprint?.2:.34,gain:sprint?1:.7});
 const beforeX=player.x,beforeY=player.y;moveBody2d(player,dx,dy,state.entities);
 faceMovement2d(player,player.x-beforeX,player.y-beforeY);
 if(player.type==='prefab'||player.type==='character'){
  if(!player._ninjaAttackUntil){player.animation=length?(sprint?'run':'walk'):'idle';if(player.assetId?.startsWith('zombie'))player.animation=length?'walk_zombie':'idle_zombie'}
 }
 return {moving:length>0,sprinting:sprint};
}
export function followPlayer(player,canvas,dt){
 if(!motion.cameraFollow||!player||!canvas)return;
 Object.assign(state.camera,followCamera2d(state.camera,player,{width:canvas.clientWidth,height:canvas.clientHeight},dt,{snap:!motion.cameraInitialized}));motion.cameraInitialized=true;
}
