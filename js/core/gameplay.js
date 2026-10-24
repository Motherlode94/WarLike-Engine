import {resetAdvanced,updateAdvanced,drawAdvanced,consumeAmmo,consumeMedkit} from './mode-advanced.js';
import {resetGameMode,updateGameMode,drawMode,registerElimination,currentMode,modeRuntime} from './game-modes.js';
import {updateBuildings,isBuildingSolid,isBuilding} from './building-system.js';
import {drawRpgNotices} from './rpg-systems.js';
import {updateLogic,drawLogic,resetLogic,logic} from './visual-logic.js';
import {updateVehicles,currentVehicle,drawDrivingHud,resetDriving} from './vehicle.js';
import {state} from './state.js';
import {getAsset} from '../assets/catalog.js';
export const game={projectiles:[],particles:[],score:0,life:100,wave:1,time:0,fireTimer:0,meleeTimer:0,hurtTimer:0,over:false,mouse:{x:500,y:300,down:false},kills:0};
export function resetGame(){resetGameMode();resetAdvanced();resetLogic();resetDriving();Object.assign(game,{projectiles:[],particles:[],score:0,life:100,wave:1,time:0,fireTimer:0,meleeTimer:0,hurtTimer:0,over:false,kills:0,mouse:{...game.mouse,down:false}});for(const e of state.entities){e._cooldown=0;e._hit=0}}
const center=e=>({x:e.x+e.w/2,y:e.y+e.h/2});
const overlaps=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
const enemy=o=>!o._modeEliminated&&o.type==='prefab'&&getAsset(o.assetId)?.category==='Monsters';
const solid=o=>isBuildingSolid(o)||o.type==='object'||o.type==='prefab'&&getAsset(o.assetId)?.category==='Props'&&['crate','barrel','wall','sandbag','fence','rock'].includes(o.assetId);
function flash(x,y,color,count=8){for(let i=0;i<count;i++){const a=Math.PI*2*i/count+Math.random()*.5,s=30+Math.random()*75;game.particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:.25+Math.random()*.4,color})}}
function move(e,dx,dy){const oldX=e.x;e.x+=dx;if(state.entities.some(o=>o!==e&&solid(o)&&overlaps(e,o)))e.x=oldX;const oldY=e.y;e.y+=dy;if(state.entities.some(o=>o!==e&&solid(o)&&overlaps(e,o)))e.y=oldY}
function shoot(p,at){const origin=center(p),dx=at.x-origin.x,dy=at.y-origin.y,d=Math.hypot(dx,dy)||1,ux=dx/d,uy=dy/d;game.projectiles.push({x:origin.x,y:origin.y,vx:ux*560,vy:uy*560,life:1.35,damage:34});flash(origin.x+ux*22,origin.y+uy*22,'#fcd36e',4)}
export function updateGame(dt){if(!state.playing||game.over&&!currentMode())return;game.time+=dt;game.fireTimer=Math.max(0,game.fireTimer-dt);game.meleeTimer=Math.max(0,game.meleeTimer-dt);game.hurtTimer=Math.max(0,game.hurtTimer-dt);const p=state.entities.find(o=>o.type==='player'||o.type==='character'||o.type==='prefab'&&getAsset(o.assetId)?.category==='Characters');if(!p)return;
if(modeRuntime.roundOver)return;if(modeRuntime.playerOut){updateGameMode(dt,game);return}const k=state.keys,x=(k.has('arrowright')||k.has('d')?1:0)-(k.has('arrowleft')||k.has('q')||k.has('a')?1:0),y=(k.has('arrowdown')||k.has('s')?1:0)-(k.has('arrowup')||k.has('z')||k.has('w')?1:0),length=Math.hypot(x,y)||1;updateVehicles(dt,p);if(!currentVehicle())move(p,x/length*190*dt,y/length*190*dt);
if(p.assetId==='ninja'||p.assetId==='ninja-elite'){
 if((k.has('k')||k.has('shift'))&&game.meleeTimer===0&&!currentVehicle()){
  game.meleeTimer=.48;p.animation='katana_attack_1';p._ninjaAttackUntil=game.time+.3;
  const pc=center(p);for(const foe of [...state.entities].filter(enemy)){const ec=center(foe),distance=Math.hypot(ec.x-pc.x,ec.y-pc.y);if(distance<100){foe.hp=(foe.hp??75)-55;foe._hit=.2;flash(ec.x,ec.y,'#a9e2f2',9);if(foe.hp<=0){if(!currentMode())state.entities=state.entities.filter(o=>o!==foe);game.kills++;game.score+=100;registerElimination(foe,p,game)}}}
 }
 if(p._ninjaAttackUntil&&game.time>p._ninjaAttackUntil){p.animation='idle';p._ninjaAttackUntil=0}
}
const aim=game.mouse.x===500&&game.mouse.y===300?{x:p.x+300,y:p.y}:game.mouse;
if(!currentVehicle()&&(game.mouse.down||k.has('f')||k.has(' '))&&game.fireTimer===0){if(consumeAmmo())shoot(p,aim);game.fireTimer=.16}if(k.has('h')&&game.fireTimer===0&&consumeMedkit(game))game.fireTimer=.4;
for(const e of state.entities.filter(enemy)){if(currentMode()&&['teamDeathmatch','frontline'].includes(currentMode().kind)&&e.team===p.team)continue;e._cooldown=Math.max(0,(e._cooldown||0)-dt);e._hit=Math.max(0,(e._hit||0)-dt);const a=center(e),b=center(p),dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy)||1;if(e.assetId==='zombie-runner'&&d<600)e.animation='run_zombie';else if(e.assetId==='zombie-crawler')e.animation='crawl';else if(e.assetId==='zombie-brute'&&d<80)e.animation='mutant_smash';else if(e.assetId?.startsWith('zombie')&&d<650)e.animation='walk_zombie';const mode=e.behavior||'none',range=Math.max(70,Number(e.detectionRadius)||650),speed=Math.max(0,Number(e.aiSpeed)||65);
if(mode==='chase'&&d<range&&d>38)move(e,dx/d*speed*dt,dy/d*speed*dt);
if(mode==='patrol'||mode==='wander'){const period=mode==='wander'?2.3:1.5;move(e,Math.cos(game.time*period+e.id)*speed*.4*dt,Math.sin(game.time*(mode==='wander'?1.8:.8)+e.id)*speed*.22*dt)}
if(mode==='flee'&&d<range)move(e,-dx/d*speed*dt,-dy/d*speed*dt);
if(mode==='follow'&&d>90&&d<range)move(e,dx/d*speed*dt,dy/d*speed*dt);
if(mode==='guard'&&d<Math.min(range,260)&&d>48)move(e,dx/d*speed*dt,dy/d*speed*dt);if(d<48&&e._cooldown===0&&game.hurtTimer===0){game.life=Math.max(0,game.life-11);game.hurtTimer=.45;e._cooldown=.7;flash(b.x,b.y,'#f35b66',6);if(game.life===0){if(currentMode())registerElimination(p,e,game);else game.over=true}}}
for(const b of game.projectiles){b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;for(const e of state.entities.filter(enemy)){if(b.life<=0)break;if(currentMode()&&['teamDeathmatch','frontline'].includes(currentMode().kind)&&e.team===p.team)continue;if(b.x>=e.x&&b.x<=e.x+e.w&&b.y>=e.y&&b.y<=e.y+e.h){e.hp=(e.hp??65)-b.damage;e._hit=.12;b.life=0;flash(b.x,b.y,'#f3a862',9);if(e.hp<=0){if(!currentMode())state.entities=state.entities.filter(o=>o!==e);game.kills++;game.score+=100;registerElimination(e,p,game)}break}}const hitObject=state.entities.find(e=>solid(e)&&b.x>=e.x&&b.x<=e.x+e.w&&b.y>=e.y&&b.y<=e.y+e.h);if(hitObject){b.life=0;flash(b.x,b.y,'#c5b6a0',4);if(isBuilding(hitObject)){hitObject.buildHp=Math.max(0,Number(hitObject.buildHp??600)-b.damage);if(hitObject.buildHp===0)hitObject.buildState='destroyed';else if(hitObject.buildHp<(hitObject.buildMaxHp||600)*.5)hitObject.buildState='damaged'}}}
game.projectiles=game.projectiles.filter(b=>b.life>0);
for(const e of state.entities.filter(o=>o.type==='prefab'&&o.assetId==='medkit')){if(overlaps(p,e)){game.life=Math.min(100,game.life+35);state.entities=state.entities.filter(o=>o!==e);flash(e.x,e.y,'#5af7ad',10)}}
updateBuildings(dt);updateLogic(dt);updateGameMode(dt,game);updateAdvanced(dt,game);if(logic.healthDelta!==0){game.life=Math.max(0,Math.min(100,game.life+logic.healthDelta));logic.healthDelta=0;if(game.life===0)game.over=true}
for(const a of game.particles){a.x+=a.vx*dt;a.y+=a.vy*dt;a.life-=dt}
game.particles=game.particles.filter(a=>a.life>0);
}
export function drawGame(ctx,width,height){if(!state.playing)return;ctx.save();const c=state.camera;ctx.translate(c.x,c.y);ctx.scale(c.zoom,c.zoom);for(const b of game.projectiles){ctx.fillStyle='#ffe58d';ctx.beginPath();ctx.arc(b.x,b.y,4,0,Math.PI*2);ctx.fill()}for(const p of game.particles){ctx.globalAlpha=Math.min(1,p.life*3);ctx.fillStyle=p.color;ctx.fillRect(p.x-3,p.y-3,6,6)}ctx.restore();ctx.globalAlpha=1;
ctx.save();ctx.fillStyle='#101b28dd';ctx.fillRect(16,16,252,79);ctx.fillStyle='#dceaf2';ctx.font='bold 13px system-ui';ctx.fillText('WARLIKE // PLAY MODE',28,37);ctx.fillStyle='#344353';ctx.fillRect(28,47,215,13);ctx.fillStyle=game.life<35?'#ed6464':'#51d0aa';ctx.fillRect(28,47,Math.max(0,215*game.life/100),13);ctx.fillStyle='#fff';ctx.font='11px system-ui';ctx.fillText('HP '+game.life+' / 100   •   Kills '+game.kills+'   •   Score '+game.score,28,79);
if(game.hurtTimer>0){ctx.fillStyle='rgba(240,50,50,.08)';ctx.fillRect(0,0,width,height)}
if(game.over){ctx.fillStyle='#07121ad9';ctx.fillRect(0,0,width,height);ctx.textAlign='center';ctx.font='bold 32px system-ui';ctx.fillStyle='#ff8888';ctx.fillText('GAME OVER',width/2,height/2);ctx.font='15px system-ui';ctx.fillStyle='#fff';ctx.fillText('Stop puis Play pour recommencer',width/2,height/2+32)}ctx.restore();drawDrivingHud(ctx,width,height,state.entities.find(o=>o.type==='player'||o.type==='character'||o.type==='prefab'&&getAsset(o.assetId)?.category==='Characters'));drawLogic(ctx,width,height);drawRpgNotices(ctx,width,height);drawMode(ctx,width,height);drawAdvanced(ctx,width,height)}
export function bindGameInput(canvas){canvas.addEventListener('pointermove',e=>{const rect=canvas.getBoundingClientRect(),c=state.camera;game.mouse.x=(e.clientX-rect.left-c.x)/c.zoom;game.mouse.y=(e.clientY-rect.top-c.y)/c.zoom});canvas.addEventListener('pointerdown',e=>{if(state.playing&&e.button===0)game.mouse.down=true});window.addEventListener('pointerup',()=>game.mouse.down=false);window.addEventListener('blur',()=>game.mouse.down=false)}
