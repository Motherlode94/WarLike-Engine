import {tickLifeSimulation} from './life-simulation.js';
import {noteAnimatorAction} from './animator-graph.js';
import {lanActor,isLanGuest} from './lan-state.js';
import {gameplayInputBlocked,gameplayKeys} from './gameplay-input.js';
import {damageSimulationNode} from './simulation-nodes.js';
import {emitFx} from './fx-runtime.js';
import {tickHeroRuntime} from './superhero-runtime.js';
import {progressionDamageScale,awardExperience} from './rpg-progression.js';
import {stepPhysics2d,controllerMode2d,solidCollider2d} from './physics-2d.js';
import {faceMovement2d} from './character-facing.js';
import {gameIsRunning,gameSession} from './game-session.js';
import {updateAi,updateStats,setHealth,damage} from './gameplay-components.js';
import {healthOf,isHostileTo} from './ai-perception.js';
import {updateHorrorAudio} from './horror-audio.js';
import {updateThreatScanner} from '../ui/threat-scanner.js';
import {updateEngineDiagnosticsPanel} from '../ui/engine-diagnostics-panel.js';
import {tickEngineDiagnostics} from './engine-diagnostics.js';
import {updateComponentRuntime} from './component-runtime.js';
import {updateOpenWorld} from './open-world-systems.js';
import {sequenceRuntime} from './logic-sequences.js';
import {horror,updateHorror,updateHorrorPerception} from './horror-survival.js';
import {updateSequences,drawSequenceMessages} from './logic-sequences.js';
import {playSound} from './audio.js';
import {workspace} from './workspaces.js';
import {resetElements,updateElements,elementsRuntime} from './game-elements.js';
import {resetHousing,updateHousing,updateHouseAnimation,drawHousing,housingActive} from './housing.js';
import {walkPlayer,followPlayer,motion} from './player-controller.js';
import {resetAdvanced,updateAdvanced,drawAdvanced,consumeAmmo,consumeMedkit} from './mode-advanced.js';
import {resetGameMode,updateGameMode,drawMode,registerElimination,currentMode,modeRuntime} from './game-modes.js';
import {updateBuildings,isBuildingSolid,isBuilding} from './building-system.js';
import {drawRpgNotices,resetRpg,rpg} from './rpg-systems.js';
import {updateLogic,drawLogic,resetLogic,logic} from './visual-logic.js';
import {updateVehicles,currentVehicle,drawDrivingHud,resetDriving} from './vehicle.js';
import {state} from './state.js';
import {getAsset} from '../assets/catalog.js';
export const game={equippedWeaponId:null,equipHeld:false,projectiles:[],particles:[],score:0,life:100,wave:1,time:0,fireTimer:0,meleeTimer:0,hurtTimer:0,over:false,mouse:{x:500,y:300,down:false},kills:0};
export function resetGame(){motion.cameraFollow=true;motion.cameraInitialized=false;resetGameMode();resetAdvanced();resetLogic();resetDriving();resetHousing();resetElements();resetRpg();Object.assign(game,{equippedWeaponId:null,equipHeld:false,projectiles:[],particles:[],score:0,life:100,wave:1,time:0,fireTimer:0,meleeTimer:0,hurtTimer:0,over:false,kills:0,mouse:{...game.mouse,down:false}});for(const e of state.entities){e._cooldown=0;e._hit=0}const player=playerEntity();if(player)game.life=healthOf(player)}
const center=e=>({x:e.x+e.w/2,y:e.y+e.h/2});
const overlaps=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
const playerEntity=()=>lanActor(state.entities,state.entities.find(o=>o.controller2d)||state.entities.find(o=>o.type==='player'||o.type==='character'||o.type==='prefab'&&getAsset(o.assetId)?.category==='Characters'));
const enemy=o=>!o._modeEliminated&&healthOf(o)>0&&(o.ai?.enabled||o.type==='prefab'&&getAsset(o.assetId)?.category==='Monsters')&&isHostileTo(o,playerEntity(),playerEntity());
const solid=solidCollider2d;
function flash(x,y,color,count=8){emitFx('electric',{x,y,z:0},{mode:'2d',color,count:Math.min(count,12),lifetime:.3,scale:.7});for(let i=0;i<count;i++){const a=Math.PI*2*i/count+Math.random()*.5,s=30+Math.random()*75;game.particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:.25+Math.random()*.4,color})}}
function move(e,dx,dy){const oldX=e.x;e.x+=dx;if(state.entities.some(o=>o!==e&&solid(o)&&overlaps(e,o)))e.x=oldX;const oldY=e.y;e.y+=dy;if(state.entities.some(o=>o!==e&&solid(o)&&overlaps(e,o)))e.y=oldY}
function shoot(p,at,weapon){noteAnimatorAction(p,'attack',.35);
 const origin=center(p),dx=at.x-origin.x,dy=at.y-origin.y,d=Math.hypot(dx,dy)||1,ux=dx/d,uy=dy/d;
 const damage=Math.max(1,Number(weapon?.weaponDamage)||34)*progressionDamageScale(p),reach=Math.max(40,Number(weapon?.weaponRange)||760);
 const speed=weapon?.weaponClass==='melee'?500:660;
 game.projectiles.push({x:origin.x,y:origin.y,vx:ux*speed,vy:uy*speed,life:reach/speed,damage});
 flash(origin.x+ux*22,origin.y+uy*22,weapon?.weaponClass==='energy'?'#61dfef':'#fcd36e',4);playSound(weapon?.weaponClass==='energy'?'laser':'shot');
}
function gameSequenceContext(){return {mode:'2d',playing:state.playing,entities:state.entities,keys:gameplayKeys(state.keys),pressedKeys:gameplayInputBlocked()?new Set():state.keyPresses,player:playerEntity(),allocateId(){state.nextId=Math.max(state.nextId,...state.entities.map(o=>o.id+1));return state.nextId++},onSceneChange(change){state.nextId=Math.max(0,...state.entities.map(o=>o.id))+1;game.over=false;game.projectiles=[];game.life=healthOf(playerEntity());if(change.camera)Object.assign(state.camera,change.camera)}}}
export function updateGame(dt){if(isLanGuest()){const p=playerEntity();if(p){game.life=healthOf(p);followPlayer(p,document.getElementById('canvas'),dt)}return;}if(state.playing&&!gameIsRunning()){updateSequences(dt,gameSequenceContext());return}if(!state.playing||game.over&&!currentMode())return;tickEngineDiagnostics(dt);updateEngineDiagnosticsPanel(state);updateThreatScanner(state);updateComponentRuntime(dt);game.time+=dt;game.fireTimer=Math.max(0,game.fireTimer-dt);game.meleeTimer=Math.max(0,game.meleeTimer-dt);game.hurtTimer=Math.max(0,game.hurtTimer-dt);const p=playerEntity();if(p?.lifeSim?.enabled){if(!document.hidden){tickLifeSimulation(state.entities,p,dt,{keys:gameplayKeys(state.keys),inputBlocked:gameplayInputBlocked()});followPlayer(p,document.getElementById('canvas'),dt)}updateSequences(dt,gameSequenceContext());return}if(gameplayInputBlocked())state.keyPresses?.clear();tickHeroRuntime(state.entities,p,dt,{mode:'2d',sceneId:gameSession.currentSceneId,keys:state.keys,pressedKeys:state.keyPresses,aim:game.mouse.x===500&&game.mouse.y===300?null:game.mouse,inputBlocked:gameplayInputBlocked()});if(p)game.life=healthOf(p);stepPhysics2d(state.entities,dt,{exclude:p});if(!p)return;p._vehicleInputConsumed=false;setHealth(p,game.life);updateStats(state.entities,dt);updateAi(state.entities,p,dt);game.life=healthOf(p);updateOpenWorld(dt,p,state.entities,sequenceRuntime.globals);updateHorror(dt,p,state.entities,gameplayKeys(state.keys));updateHorrorPerception(dt,p,state.entities,gameplayKeys(state.keys));updateHorrorAudio(dt,p,state.entities,gameplayKeys(state.keys),horror);horror.jumpscare=Math.max(0,horror.jumpscare-dt);
if(modeRuntime.roundOver)return;if(modeRuntime.playerOut){updateGameMode(dt,game);return}const k=gameplayKeys(state.keys),x=(k.has('arrowright')||k.has('d')?1:0)-(k.has('arrowleft')||k.has('q')||k.has('a')?1:0),y=(k.has('arrowdown')||k.has('s')?1:0)-(k.has('arrowup')||k.has('z')||k.has('w')?1:0),length=Math.hypot(x,y)||1;updateHouseAnimation(dt);const indoors=updateHousing(dt,p,k);if(!indoors&&!housingActive()){updateVehicles(dt,p,k);if(!currentVehicle()&&!p._vehicleTransition)walkPlayer(p,dt,k);followPlayer(p,document.getElementById('canvas'),dt)}if(indoors||housingActive()){updateGameMode(dt,game);return}
if(p.assetId==='ninja'||p.assetId==='ninja-elite'){
 if(p.adventure?.combatEnabled!==false&&k.has('k')&&game.meleeTimer===0&&!currentVehicle()){
  game.meleeTimer=.48;p.animation='katana_attack_1';p._ninjaAttackUntil=game.time+.3;
  const pc=center(p);for(const foe of [...state.entities].filter(enemy)){const ec=center(foe),distance=Math.hypot(ec.x-pc.x,ec.y-pc.y);if(distance<100){foe.hp??=75;damage(foe,55);foe._hit=.2;flash(ec.x,ec.y,'#a9e2f2',9);if(foe.hp<=0){if(!currentMode()&&!foe.sequence&&!foe.sequences?.length)state.entities=state.entities.filter(o=>o!==foe);foe.animation='death';awardExperience(p,40);game.life=healthOf(p);game.kills++;game.score+=100;playSound('impact');registerElimination(foe,p,game)}}}
 }
 if(p._ninjaAttackUntil&&game.time>p._ninjaAttackUntil){p.animation='idle';p._ninjaAttackUntil=0}
}
const equip=k.has('g');if(equip&&!game.equipHeld&&!currentVehicle()){
 const near=state.entities.filter(e=>e.type==='prefab'&&getAsset(e.assetId)?.category==='Weapons').map(e=>({e,d:Math.hypot(center(e).x-center(p).x,center(e).y-center(p).y)})).sort((a,b)=>a.d-b.d)[0];
 if(near?.d<110)game.equippedWeaponId=near.e.id;
}
game.equipHeld=equip;
const equipped=state.entities.find(e=>e.id===game.equippedWeaponId&&getAsset(e.assetId)?.category==='Weapons');
const aim=game.mouse.x===500&&game.mouse.y===300?{x:p.x+300,y:p.y}:game.mouse;
if(p.adventure?.combatEnabled!==false&&!currentVehicle()&&(!gameplayInputBlocked()&&game.mouse.down||k.has('f')||!gameplayInputBlocked()&&state.keyPresses?.has('f')||k.has(' ')&&controllerMode2d(p,state.entities)!=='platformer')&&game.fireTimer===0){if(!equipped||equipped.weaponClass==='melee'||consumeAmmo())shoot(p,aim,equipped);game.fireTimer=Math.max(.06,Number(equipped?.weaponInterval)||.16)}if(k.has('h')&&game.fireTimer===0&&consumeMedkit(game))game.fireTimer=.4;
for(const e of state.entities.filter(enemy)){if(e.ai)continue;if(currentMode()&&['teamDeathmatch','frontline'].includes(currentMode().kind)&&e.team===p.team)continue;e._cooldown=Math.max(0,(e._cooldown||0)-dt);e._hit=Math.max(0,(e._hit||0)-dt);const a=center(e),b=center(p),dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy)||1;if(e.assetId==='zombie-runner'&&d<600)e.animation='run_zombie';else if(e.assetId==='zombie-crawler')e.animation='crawl';else if(e.assetId==='zombie-brute'&&d<80)e.animation='mutant_smash';else if(e.assetId?.startsWith('zombie')&&d<650)e.animation='walk_zombie';const mode=e.horrorAiConfig?.enabled&&horror.enabled?'none':e.behavior||'none',range=Math.max(70,Number(e.detectionRadius)||650),speed=Math.max(0,Number(e.aiSpeed)||65);
if(mode==='chase'&&d<range&&d>38)move(e,dx/d*speed*dt,dy/d*speed*dt);
if(mode==='patrol'||mode==='wander'){const period=mode==='wander'?2.3:1.5;move(e,Math.cos(game.time*period+e.id)*speed*.4*dt,Math.sin(game.time*(mode==='wander'?1.8:.8)+e.id)*speed*.22*dt)}
if(mode==='flee'&&d<range)move(e,-dx/d*speed*dt,-dy/d*speed*dt);
if(mode==='follow'&&d>90&&d<range)move(e,dx/d*speed*dt,dy/d*speed*dt);
if(mode==='guard'&&d<Math.min(range,260)&&d>48)move(e,dx/d*speed*dt,dy/d*speed*dt);if(d<48&&e._cooldown===0&&game.hurtTimer===0){game.life=damage(p,11);game.hurtTimer=.45;playSound('hurt');e._cooldown=.7;flash(b.x,b.y,'#f35b66',6);if(game.life===0){if(currentMode())registerElimination(p,e,game);else game.over=true}}}
for(const b of game.projectiles){b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;for(const e of state.entities.filter(enemy)){if(b.life<=0)break;if(currentMode()&&['teamDeathmatch','frontline'].includes(currentMode().kind)&&e.team===p.team)continue;if(b.x>=e.x&&b.x<=e.x+e.w&&b.y>=e.y&&b.y<=e.y+e.h){e.hp??=65;damage(e,b.damage);e._hit=.12;b.life=0;flash(b.x,b.y,'#f3a862',9);if(e.hp<=0){if(!currentMode()&&!e.sequence&&!e.sequences?.length)state.entities=state.entities.filter(o=>o!==e);e.animation='death';awardExperience(p,40);game.life=healthOf(p);game.kills++;game.score+=100;registerElimination(e,p,game)}break}}const hitObject=state.entities.find(e=>e!==p&&solid(e)&&b.x>=e.x&&b.x<=e.x+e.w&&b.y>=e.y&&b.y<=e.y+e.h);if(hitObject){b.life=0;flash(b.x,b.y,'#c5b6a0',4);if(hitObject.simulationNode?.kind==='destructible'){damageSimulationNode(hitObject,b.damage,p,{mode:'2d'});game.life=healthOf(p)}if(isBuilding(hitObject)){hitObject.buildHp=Math.max(0,Number(hitObject.buildHp??600)-b.damage);if(hitObject.buildHp===0)hitObject.buildState='destroyed';else if(hitObject.buildHp<(hitObject.buildMaxHp||600)*.5)hitObject.buildState='damaged'}}}
game.projectiles=game.projectiles.filter(b=>b.life>0);
for(const e of state.entities.filter(o=>o.type==='prefab'&&o.assetId==='medkit')){if(overlaps(p,e)){game.life=Math.min(p.stats?.maxHealth||100,game.life+35);state.entities=state.entities.filter(o=>o!==e);flash(e.x,e.y,'#5af7ad',10)}}
updateBuildings(dt);updateElements(dt,p,game);updateLogic(dt);setHealth(p,Math.min(p.stats?.maxHealth||100,game.life));updateSequences(dt,gameSequenceContext());game.life=healthOf(playerEntity()||p);updateGameMode(dt,game);updateAdvanced(dt,game);if(logic.healthDelta!==0){game.life=Math.max(0,Math.min(100,game.life+logic.healthDelta));logic.healthDelta=0}setHealth(p,game.life);if(game.life<=0){if(currentMode())registerElimination(p,null,game);else game.over=true}
for(const a of game.particles){a.x+=a.vx*dt;a.y+=a.vy*dt;a.life-=dt}
game.particles=game.particles.filter(a=>a.life>0);
}
export function drawGame(ctx,width,height){if(!state.playing)return;ctx.save();const c=state.camera;ctx.translate(c.x,c.y);ctx.scale(c.zoom,c.zoom);for(const b of game.projectiles){ctx.fillStyle='#ffe58d';ctx.beginPath();ctx.arc(b.x,b.y,4,0,Math.PI*2);ctx.fill()}for(const p of game.particles){ctx.globalAlpha=Math.min(1,p.life*3);ctx.fillStyle=p.color;ctx.fillRect(p.x-3,p.y-3,6,6)}ctx.restore();ctx.globalAlpha=1;if(playerEntity()?.lifeSim?.enabled)return;if(playerEntity()?.adventure?.combatEnabled===false){drawSequenceMessages(ctx,width,height);return}
ctx.save();ctx.fillStyle='#101b28dd';ctx.fillRect(16,16,252,79);ctx.fillStyle='#dceaf2';ctx.font='bold 13px system-ui';ctx.fillText('WARLIKE // PLAY MODE',28,37);ctx.fillStyle='#344353';ctx.fillRect(28,47,215,13);ctx.fillStyle=game.life<35?'#ed6464':'#51d0aa';ctx.fillRect(28,47,Math.max(0,215*game.life/(playerEntity()?.stats?.maxHealth||100)),13);ctx.fillStyle='#fff';ctx.font='11px system-ui';ctx.fillText('HP '+Math.ceil(game.life)+' / '+(playerEntity()?.stats?.maxHealth||100)+'   •   Kills '+game.kills+'   •   Score '+game.score,28,79);
if(game.hurtTimer>0){ctx.fillStyle='rgba(240,50,50,.08)';ctx.fillRect(0,0,width,height)}
if(game.over){ctx.fillStyle='#07121ad9';ctx.fillRect(0,0,width,height);ctx.textAlign='center';ctx.font='bold 32px system-ui';ctx.fillStyle='#ff8888';ctx.fillText('GAME OVER',width/2,height/2);ctx.font='15px system-ui';ctx.fillStyle='#fff';ctx.fillText('Stop puis Play pour recommencer',width/2,height/2+32)}ctx.restore();if(!currentVehicle()&&!modeRuntime.playerOut){ctx.save();ctx.fillStyle='#101b28bb';ctx.fillRect(16,height-34,330,25);ctx.fillStyle='#ccebe8';ctx.font='11px system-ui';ctx.fillText(controllerMode2d(playerEntity(),state.entities)==='platformer'?'Q/D · ←/→ marcher · Espace/Z/W sauter · Maj courir':'ZQSD / WASD marcher • Maj courir • E véhicule • C caméra',25,height-17);ctx.restore()}if(!currentVehicle()){ctx.save();ctx.fillStyle='#102734e6';ctx.fillRect(16,105,245,29);ctx.font='12px system-ui';ctx.fillStyle='#b7f3e0';const held=state.entities.find(e=>e.id===game.equippedWeaponId);ctx.fillText(held?'Arme : '+held.name:'G : équiper une arme proche',24,124);ctx.restore()}drawDrivingHud(ctx,width,height,state.entities.find(o=>o.type==='player'||o.type==='character'||o.type==='prefab'&&getAsset(o.assetId)?.category==='Characters'));drawLogic(ctx,width,height);drawSequenceMessages(ctx,width,height);drawRpgNotices(ctx,width,height);drawMode(ctx,width,height);drawAdvanced(ctx,width,height);drawHousing(ctx,width,height,state.entities.find(o=>o.type==='player'||o.type==='character'||o.type==='prefab'&&getAsset(o.assetId)?.category==='Characters'))}
// Play simulation is independent from the canvas currently displayed (2D or 3D).
let simulationStarted=false;
export function startGameSimulation(){
 if(simulationStarted)return;
 simulationStarted=true;
 let previous=performance.now();
 function frame(now){
  requestAnimationFrame(frame);
  const delta=Math.min(.05,Math.max(0,(now-previous)/1000));previous=now;
  if(state.playing&&workspace.mode==='2d'){const positions=new Map(state.entities.map(o=>[o,{x:o.x,y:o.y}]));updateGame(delta);for(const o of state.entities){const before=positions.get(o),asset=getAsset(o.assetId);if(before&&(o.controller2d||o.type==='character'||o.type==='player'||asset?.kind==='actor'||['Characters','Monsters'].includes(asset?.category)))faceMovement2d(o,o.x-before.x,o.y-before.y)}}
 }
 requestAnimationFrame(frame);
}
export function bindGameInput(canvas){canvas.addEventListener('pointermove',e=>{const rect=canvas.getBoundingClientRect(),c=state.camera;game.mouse.x=((e.clientX-rect.left)*canvas.clientWidth/rect.width-c.x)/c.zoom;game.mouse.y=((e.clientY-rect.top)*canvas.clientHeight/rect.height-c.y)/c.zoom});canvas.addEventListener('pointerdown',e=>{if(state.playing&&e.button===0&&!e.defaultPrevented)game.mouse.down=true});window.addEventListener('pointerup',()=>game.mouse.down=false);window.addEventListener('blur',()=>game.mouse.down=false)}
