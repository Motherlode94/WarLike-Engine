// Single-player extensions for WarLike match presets: AI skirmish, loot, RP jobs, three flag fronts.
import {state} from './state.js';
import {getAsset} from '../assets/catalog.js';
import {currentMode,modeRuntime,registerElimination} from './game-modes.js';

const isActor=o=>o&&(o.type==='player'||o.type==='character'||o.type==='prefab'&&['Characters','Monsters'].includes(getAsset(o.assetId)?.category));
const center=o=>({x:o.x+o.w/2,y:o.y+o.h/2});
const distance=(a,b)=>{const x=center(a),y=center(b);return Math.hypot(x.x-y.x,x.y-y.y)};
const player=()=>state.entities.find(e=>e.type==='player'||e.type==='character'||e.type==='prefab'&&getAsset(e.assetId)?.category==='Characters');
export const advanced={loot:[],inventory:{ammo:35,armor:0,medkits:0},bots:new Map(),points:[],interactHeld:false,notifications:[],tasks:0,respawnCount:0};
export function resetAdvanced(){
 const m=currentMode();
 Object.assign(advanced,{loot:[],inventory:{ammo:35,armor:0,medkits:0},bots:new Map(),points:[],interactHeld:false,notifications:[],tasks:0,respawnCount:0});
 if(!m)return;
 if(m.kind==='battleRoyale'){
  for(const [index,p] of [[270,225],[460,490],[745,190],[930,430],[1180,220],[640,580]].entries()){
    advanced.loot.push({id:index,x:p[0],y:p[1],kind:['medkit','ammo','armor'][index%3],picked:false});
  }
 }
 if(m.kind==='frontline'){
  const x=Number(m.captureX)||700,y=Number(m.captureY)||340;
  advanced.points=[{name:'A',x:x-245,y:y-70,progress:0,owner:0,scoreTimer:0},
    {name:'B',x,y,progress:0,owner:0,scoreTimer:0},{name:'C',x:x+245,y:y+70,progress:0,owner:0,scoreTimer:0}];
 }
}
const note=text=>{advanced.notifications.unshift({text,until:modeRuntime.elapsed+3});advanced.notifications.length=Math.min(4,advanced.notifications.length)};
export function consumeAmmo(){if(currentMode()?.kind!=='battleRoyale')return true;if(advanced.inventory.ammo<=0){note('Munitions épuisées : ramasse du butin !');return false}advanced.inventory.ammo--;return true}
export function consumeMedkit(game){if(advanced.inventory.medkits<=0)return false;advanced.inventory.medkits--;game.life=Math.min(100,game.life+45);note('Trousse de soin utilisée');return true}
export function advancedInput(game){const m=currentMode();if(!m||!state.playing||modeRuntime.roundOver)return;const p=player();if(!p||modeRuntime.playerOut)return;const pressed=state.keys.has('e');
 if(pressed&&!advanced.interactHeld){
  if(m.kind==='battleRoyale'){
    const loot=advanced.loot.find(l=>!l.picked&&Math.hypot(center(p).x-l.x,center(p).y-l.y)<85);
    if(loot){loot.picked=true;if(loot.kind==='ammo')advanced.inventory.ammo+=25;if(loot.kind==='medkit')advanced.inventory.medkits++;if(loot.kind==='armor')advanced.inventory.armor=Math.min(100,advanced.inventory.armor+45);note('Ramassé : '+loot.kind)}
  }
  if(m.kind==='roleplay'){
    const station=state.entities.filter(o=>getAsset(o.assetId)?.category==='Buildings'&&distance(p,o)<150).sort((a,b)=>distance(p,a)-distance(p,b))[0];
    if(station){
      const jobs={Police:{'city-police':{money:40,text:'Patrouille terminée'},'rts-hq':{money:40,text:'Rapport de sécurité transmis'}},
        Medic:{'city-hospital':{money:30,text:'Patient soigné'}},
        Mechanic:{'city-warehouse':{money:35,text:'Réparation effectuée'},'rts-factory':{money:35,text:'Véhicule réparé'}},
        Merchant:{'city-shop':{money:25,text:'Vente effectuée'}},
        Soldier:{'rts-hq':{money:35,text:'Mission sécurisée'}},
        Civilian:{'city-shop':{money:12,text:'Mission de livraison terminée'}}};
      const task=jobs[modeRuntime.role]?.[station.assetId];
      if(task){
        if(modeRuntime.elapsed-(station._lastModeTask||-100)<8)note('Mission disponible dans quelques secondes');
        else{station._lastModeTask=modeRuntime.elapsed;modeRuntime.money+=task.money;advanced.tasks++;note(task.text+' +'+task.money+'$')}
      }else note('Ce lieu ne correspond pas à ton métier');
    }
  }
 }
 advanced.interactHeld=pressed;
}
function botFight(dt,game){
 const m=currentMode();if(!m||m.kind==='roleplay'||modeRuntime.roundOver)return;
 const list=state.entities.filter(e=>isActor(e)&&!e._modeEliminated);
 for(const e of list){
  if(e===player())continue;
  if(!['Monsters','Characters'].includes(getAsset(e.assetId)?.category))continue;
  const data=advanced.bots.get(e.id)||{cooldown:.7+(e.id%4)*.3};data.cooldown-=dt;
  if(data.cooldown<=0){
   const candidates=list.filter(o=>o!==e&&(m.kind==='deathmatch'||m.kind==='battleRoyale'||o.team!==e.team)&&distance(o,e)<310);
   if(candidates.length){const target=candidates.sort((a,b)=>distance(e,a)-distance(e,b))[0];
    const chance=.62;data.cooldown=1.2+(e.id%5)*.32;
    if(Math.random()<chance){
      if(target===player()){
        if(!modeRuntime.playerOut){let damage=10;const shield=advanced.inventory.armor;const absorb=Math.min(shield,damage*.6);advanced.inventory.armor-=absorb;damage-=absorb;game.life=Math.max(0,game.life-damage);if(game.life===0)registerElimination(target,e,game)}
      }else{
        target.hp=(target.hp??100)-18;
        if(target.hp<=0)registerElimination(target,e,game);
      }
    }
   }else data.cooldown=.55;
  }
  advanced.bots.set(e.id,data);
 }
}
function frontline(dt){
 const m=currentMode();if(m?.kind!=='frontline'||modeRuntime.roundOver)return;
 const participants=state.entities.filter(e=>isActor(e)&&!e._modeEliminated);
 for(const pt of advanced.points){
  const occupancy=participants.filter(e=>Math.hypot(center(e).x-pt.x,center(e).y-pt.y)<Math.max(30,Number(m.captureRadius)||115));
  const difference=occupancy.filter(e=>e.team===1).length-occupancy.filter(e=>e.team===2).length;
  if(difference){pt.progress=Math.max(-100,Math.min(100,pt.progress+Math.sign(difference)*dt*100/Math.max(2,Number(m.captureSeconds)||12)));}
  const newOwner=pt.progress===100?1:pt.progress===-100?2:pt.owner;
  if(newOwner!==pt.owner){pt.owner=newOwner;note('Point '+pt.name+' capturé par équipe '+newOwner)}
  if(pt.owner){pt.scoreTimer+=dt;if(pt.scoreTimer>=5){pt.scoreTimer-=5;modeRuntime.teamScores[pt.owner]+=Math.max(1,Number(m.scorePerCapture)||2);if(modeRuntime.teamScores[pt.owner]>=Math.max(1,Number(m.scoreLimit)||10)){modeRuntime.roundOver=true;modeRuntime.winner='Victoire équipe '+pt.owner}}}
 }
}
export function updateAdvanced(dt,game){
 if(!state.playing||!currentMode()||modeRuntime.roundOver)return;
 advancedInput(game);botFight(dt,game);frontline(dt);
 advanced.notifications=advanced.notifications.filter(x=>x.until>modeRuntime.elapsed);
}
export function drawAdvanced(ctx,w,h){
 const m=currentMode();if(!state.playing||!m)return;const camera=state.camera;
 ctx.save();ctx.translate(camera.x,camera.y);ctx.scale(camera.zoom,camera.zoom);
 if(m.kind==='battleRoyale'){
  for(const l of advanced.loot.filter(o=>!o.picked)){ctx.fillStyle=l.kind==='medkit'?'#58d9a3':l.kind==='ammo'?'#e2c47b':'#a78aff';ctx.fillRect(l.x-12,l.y-12,24,24);ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.strokeRect(l.x-12,l.y-12,24,24);ctx.fillStyle='#fff';ctx.font='11px system-ui';ctx.fillText(l.kind,l.x-15,l.y-18)}
 }
 if(m.kind==='frontline')for(const pt of advanced.points){ctx.beginPath();ctx.arc(pt.x,pt.y,Math.max(30,Number(m.captureRadius)||115),0,Math.PI*2);ctx.fillStyle=pt.owner===1?'#65b6ff33':pt.owner===2?'#ff855a33':'#b9e8e133';ctx.fill();ctx.strokeStyle=pt.owner===1?'#65b6ff':pt.owner===2?'#ff855a':'#b9e8e1';ctx.lineWidth=3/camera.zoom;ctx.stroke();ctx.fillStyle='#fff';ctx.font='bold 19px system-ui';ctx.fillText(pt.name+' '+Math.abs(Math.round(pt.progress))+'%',pt.x-25,pt.y)}
 ctx.restore();
 ctx.save();ctx.fillStyle='#101b28e9';ctx.font='12px system-ui';if(m.kind==='battleRoyale'){ctx.fillRect(w-276,110,262,45);ctx.fillStyle='#cfeee2';ctx.fillText('Ammo '+advanced.inventory.ammo+'  Armor '+Math.round(advanced.inventory.armor)+'  Medkits '+advanced.inventory.medkits,w-264,138)}
 if(m.kind==='roleplay'){ctx.fillRect(w-276,110,262,45);ctx.fillStyle='#cfeee2';ctx.fillText('Missions : '+advanced.tasks+' • E : travailler • H : soins',w-264,138)}
 for(const [i,n] of advanced.notifications.entries()){ctx.fillStyle='#b0fce5';ctx.fillText(n.text,24,210+i*18)}ctx.restore();
}
