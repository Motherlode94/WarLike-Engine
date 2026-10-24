import {playSound} from './audio.js';
// Runtime interactions for reusable WarLike Elements.
import {state} from './state.js';
import {getAsset} from '../assets/catalog.js';
import {giveItem,hasItem,notice} from './rpg-systems.js';
import {currentVehicle,driving} from './vehicle.js';
export const isElement=o=>o?.type==='prefab'&&getAsset(o.assetId)?.category==='Elements';
export const elementDefaults=()=>({elementEnabled:true,elementValue:1,elementDamage:10,elementRadius:52,elementTargetX:600,elementTargetY:350,elementKey:'keycard',elementCooldown:0,elementUsed:false});
export const elementsRuntime={checkpoint:null,coins:0,finished:false,interactionHeld:false,boostTime:0,damageCooldown:0,notifications:[]};
const center=o=>({x:o.x+o.w/2,y:o.y+o.h/2});
const distance=(a,b)=>{const p=center(a),q=center(b);return Math.hypot(p.x-q.x,p.y-q.y)};
export function resetElements(){Object.assign(elementsRuntime,{checkpoint:null,coins:0,finished:false,interactionHeld:false,boostTime:0,damageCooldown:0,notifications:[]})}
const say=text=>{notice(text);elementsRuntime.notifications.push(String(text))}
const pickupIds=new Set(['coin','gem','health-pickup','ammo-pickup','keycard','shield-pickup','speed-pickup','quest-scroll','supply-crate','resource-node']);
const touchIds=new Set(['checkpoint','spawn-pad','finish-line','boost-pad','jump-pad','spike-trap','laser-trap','toxic-pool','mine-trap','capture-flag']);
export function updateElements(dt,player,game){
 if(!state.playing||!player)return;
 elementsRuntime.damageCooldown=Math.max(0,elementsRuntime.damageCooldown-dt);
 elementsRuntime.boostTime=Math.max(0,elementsRuntime.boostTime-dt);
 const ePressed=state.keys.has('e'),inCar=!!currentVehicle()||!!driving.transition||!!player._hiddenInHouse;
 for(const e of [...state.entities].filter(isElement)){
  if(e.elementEnabled===false||e.elementUsed)continue;
  const radius=Math.max(20,Number(e.elementRadius)||52),d=distance(player,e);
  const interacted=ePressed&&!elementsRuntime.interactionHeld&&d<radius&&!inCar;
  const touching=d<Math.max(radius,Math.max(e.w,e.h)*.55);
  if(pickupIds.has(e.assetId)&&touching&&!inCar){
    e.elementUsed=true;let amount=Math.max(1,Number(e.elementValue)||1);
    if(e.assetId==='health-pickup')game.life=Math.min(100,game.life+25*amount);
    else if(e.assetId==='shield-pickup')giveItem('shield',amount);
    else if(e.assetId==='speed-pickup'){elementsRuntime.boostTime=8;giveItem('speed-boost',amount)}
    else if(e.assetId==='coin'){elementsRuntime.coins+=amount;giveItem('coin',amount)}
    else if(e.assetId==='gem')giveItem('gem',amount);
    else giveItem(e.assetId==='keycard'?e.elementKey||'keycard':e.assetId,amount);
    playSound(e.assetId==='health-pickup'?'heal':'pickup');say('Ramassé : '+e.name);
    continue;
  }
  if(touching&&touchIds.has(e.assetId)){
    if(e.assetId==='checkpoint'||e.assetId==='spawn-pad'){if(elementsRuntime.checkpoint!==e.id){elementsRuntime.checkpoint=e.id;playSound('checkpoint');say('Checkpoint activé')}player._modeSpawn={x:e.x,y:e.y}}
    if(e.assetId==='finish-line'&&!elementsRuntime.finished){elementsRuntime.finished=true;playSound('victory');say('Ligne d’arrivée !')}
    if(e.assetId==='boost-pad'){elementsRuntime.boostTime=Math.max(1,elementsRuntime.boostTime);if(inCar)driving.speed=Math.max(driving.speed,Math.max(110,Number(e.elementValue)||2)*80)}
    if(e.assetId==='jump-pad'&&!inCar){player._actionAnimationUntil=performance.now()/1000+.5;player.animation='jump_start'}
    if(['spike-trap','laser-trap','toxic-pool','mine-trap'].includes(e.assetId)&&elementsRuntime.damageCooldown<=0){
      game.life=Math.max(0,game.life-Math.max(1,Number(e.elementDamage)||10));elementsRuntime.damageCooldown=.7;playSound(e.assetId==='mine-trap'?'explosion':'hurt');
      if(e.assetId==='mine-trap')e.elementUsed=true;
    }
  }
  if(interacted){
    switch(e.assetId){
      case 'lever':case 'pressure-plate':e._activated=!e._activated;for(const gate of state.entities.filter(x=>isElement(x)&&x.assetId==='locked-gate'))gate._gateOpen=!gate._gateOpen;playSound('switch');say('Levier activé');break;
      case 'locked-gate':if(e._gateOpen||hasItem(e.elementKey||'keycard')){e._gateOpen=true;playSound('door');say('Porte ouverte')}else say('Porte verrouillée : trouver une carte');break;
      case 'teleporter':case 'portal-pad':player.x=Number(e.elementTargetX)||600;player.y=Number(e.elementTargetY)||350;playSound('teleport');say('Téléportation');break;
      case 'save-terminal':elementsRuntime.checkpoint=e.id;player._modeSpawn={x:player.x,y:player.y};say('Point de sauvegarde de session');break;
      case 'rally-point':say('Point de ralliement activé');break;
    }
  }
  
 }
 elementsRuntime.interactionHeld=ePressed;
}
export function drawElementStates(ctx,o,now){
 if(!isElement(o))return;
 ctx.save();
 if(state.playing&&o.elementUsed&&pickupIds.has(o.assetId)){ctx.globalAlpha=.2;ctx.fillStyle='#0b2633';ctx.fillRect(o.x,o.y,o.w,o.h)}
 if(o._gateOpen&&o.assetId==='locked-gate'){ctx.globalAlpha=.35;ctx.fillStyle='#7ce9c9';ctx.fillRect(o.x,o.y,o.w,o.h)}
 if(o.assetId==='checkpoint'&&o.id===elementsRuntime.checkpoint){ctx.strokeStyle='#6affbc';ctx.lineWidth=4;ctx.strokeRect(o.x,o.y,o.w,o.h)}
 if(o.assetId==='laser-trap'&&state.playing){ctx.strokeStyle='#fb6478';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(o.x,o.y+o.h/2);ctx.lineTo(o.x+o.w,o.y+o.h/2+Math.sin(now/100)*5);ctx.stroke()}
 ctx.restore();
}
