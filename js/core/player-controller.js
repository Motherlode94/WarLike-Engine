import {followCamera2d} from './play-camera.js';
import {playSound} from './audio.js';
// WarLike 2D foot controller with solid collisions and an optional chase camera.
import {state} from './state.js';
import {getAsset} from '../assets/catalog.js';
import {isBuildingSolid} from './building-system.js';
const solid=o=>o.collision3d!==false&&!o.audioEnabled&&!o.lightType&&(o.type==='object'||isBuildingSolid(o)||o.type==='prefab'&&getAsset(o.assetId)?.category==='Props'&&['crate','barrel','wall','sandbag','fence','rock','stone-wall','wooden-palisade','traffic-barrier','ruins'].includes(o.assetId));
const overlaps=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
export const motion={cameraFollow:false,cameraInitialized:false,footSpeed:190,sprintMultiplier:1.55};
export function walkPlayer(player,dt,keys=state.keys){
 if(player._vehicleTransition||player._actionAnimationUntil>performance.now()/1000)return {moving:false,sprinting:false};
 const x=Number(keys.has('arrowright')||keys.has('d'))-Number(keys.has('arrowleft')||keys.has('a')||keys.has('q'));
 const y=Number(keys.has('arrowdown')||keys.has('s'))-Number(keys.has('arrowup')||keys.has('w')||keys.has('z'));
 const length=Math.hypot(x,y);const sprint=keys.has('shift')&&length>0;
 const speed=Math.max(10,Number(player.footSpeed)||motion.footSpeed)*(sprint?motion.sprintMultiplier:1);
 const dx=length?x/length*speed*dt:0,dy=length?y/length*speed*dt:0;if(length)playSound('step',{cooldown:sprint?.2:.34,gain:sprint?1:.7});
 const barriers=state.entities.filter(o=>o!==player&&solid(o));
 const beforeX=player.x;player.x+=dx;if(barriers.some(b=>overlaps(player,b)))player.x=beforeX;
 const beforeY=player.y;player.y+=dy;if(barriers.some(b=>overlaps(player,b)))player.y=beforeY;
 if(player.type==='prefab'||player.type==='character'){
  if(!player._ninjaAttackUntil){player.animation=length?(sprint?'run':'walk'):'idle';if(player.assetId?.startsWith('zombie'))player.animation=length?'walk_zombie':'idle_zombie'}
 }
 return {moving:length>0,sprinting:sprint};
}
export function followPlayer(player,canvas,dt){
 if(!motion.cameraFollow||!player||!canvas)return;
 Object.assign(state.camera,followCamera2d(state.camera,player,{width:canvas.clientWidth,height:canvas.clientHeight},dt,{snap:!motion.cameraInitialized}));motion.cameraInitialized=true;
}
