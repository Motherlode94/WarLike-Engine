// WarLike Studio modular single-player game rules.
// Multiplayer networking, matchmaking and authoritative servers are NOT implemented.
import {state} from './state.js';
import {getAsset} from '../assets/catalog.js';

export const modeNames={deathmatch:'Deathmatch',teamDeathmatch:'Team Deathmatch',battleRoyale:'Battle Royale',roleplay:'Roleplay / RP',frontline:'Frontline / Capture'};
export const roleNames=['Civilian','Police','Medic','Mechanic','Merchant','Soldier'];
export const modeDefaults=()=>({kind:'deathmatch',scoreLimit:10,timeLimit:240,respawnSeconds:4,
  team:1,role:'Civilian',startingMoney:200,roleSalary:30,rolePayInterval:25,
  zoneX:640,zoneY:360,zoneRadius:650,zoneMinRadius:85,zoneShrinkSeconds:180,zoneDamage:8,
  captureX:700,captureY:340,captureRadius:115,captureSeconds:12,scorePerCapture:2});
export const controller=()=>state.entities.find(e=>e.gameMode&&modeNames[e.gameMode.kind])||null;
export const currentMode=()=>controller()?.gameMode||null;
const runtime={elapsed:0,teamScores:{1:0,2:0},kills:0,deaths:0,alive:0,won:false,winner:'',roundOver:false,
 botTimers:new Map(),role:'Civilian',money:0,payTimer:0,zoneRadius:650,capture:0,captureOwner:0,captureScoring:0,events:[],playerRespawn:0,playerOut:false};
export const modeRuntime=runtime;
const center=o=>({x:o.x+o.w/2,y:o.y+o.h/2});
const participant=e=>e?.isCompetitor===true||e?.type==='player'||e?.type==='character'||e?.type==='prefab'&&['Characters','Monsters'].includes(getAsset(e.assetId)?.category);
const getPlayer=()=>state.entities.find(e=>e.type==='player'||e.type==='character'||e.type==='prefab'&&getAsset(e.assetId)?.category==='Characters');
const push=(message)=>{runtime.events.push({message,until:runtime.elapsed+4});if(runtime.events.length>5)runtime.events.shift()};
export function resetGameMode(){const m=currentMode();Object.assign(runtime,{elapsed:0,teamScores:{1:0,2:0},kills:0,deaths:0,alive:0,won:false,winner:'',roundOver:false,botTimers:new Map(),
 role:m?.role||'Civilian',money:m?.startingMoney||0,payTimer:0,zoneRadius:m?.zoneRadius||650,capture:0,captureOwner:0,captureScoring:0,events:[],playerRespawn:0,playerOut:false});
 for(const e of state.entities){delete e._modeRespawn;delete e._modeEliminated;if(participant(e)){e._modeSpawn={x:e.x,y:e.y};e._modeStartingHp=Number(e.hp)||100;if(!e.team)e.team=e===getPlayer()?(m?.team||1):2}}}
}
function end(text){runtime.roundOver=true;runtime.winner=text;push(text)}
export function registerElimination(victim,attacker,game){
 const m=currentMode();if(!m||runtime.roundOver||!participant(victim)||victim._modeEliminated)return false;
 const p=getPlayer(),local=attacker===p,team=attacker?.team||1;
 victim._modeEliminated=true;
 if(local){runtime.kills++;if(m.kind==='teamDeathmatch')runtime.teamScores[team]=(runtime.teamScores[team]||0)+1}
 if(victim===p){runtime.deaths++;runtime.playerOut=true;if(m.kind==='battleRoyale')end('Éliminé — Battle Royale');else runtime.playerRespawn=Math.max(1,Number(m.respawnSeconds)||4)}
 if(m.kind==='battleRoyale'){
   const remaining=state.entities.filter(e=>participant(e)&&!e._modeEliminated).length;
   runtime.alive=remaining;if(remaining<=1){const survivor=state.entities.find(e=>participant(e)&&!e._modeEliminated);end(survivor===p?'Victoire Royale !':'Victoire : '+(survivor?.name||'aucun survivant'))}
 }else if(victim!==p){
   const timeout=Math.max(.5,Number(m.respawnSeconds)||4);victim._modeRespawn=runtime.elapsed+timeout;
 }
 if(local&&m.kind==='deathmatch'&&runtime.kills>=Math.max(1,Number(m.scoreLimit)||10))end('Victoire Deathmatch');
 if(m.kind==='teamDeathmatch'&&Object.values(runtime.teamScores).some(v=>v>=Math.max(1,Number(m.scoreLimit)||10)))end('Victoire équipe '+(runtime.teamScores[1]>=runtime.teamScores[2]?1:2));
 push(victim.name+' éliminé');
 return true;
}
function respawn(e){e._modeEliminated=false;delete e._modeRespawn;e.x=e._modeSpawn?.x??e.x;e.y=e._modeSpawn?.y??e.y;e.hp=e._modeStartingHp||100;e._cooldown=0}
export function updateGameMode(dt,game){
 const m=currentMode();if(!state.playing||!m||runtime.roundOver)return;
 runtime.elapsed+=dt;runtime.events=runtime.events.filter(e=>e.until>runtime.elapsed);
 const p=getPlayer();if(!p)return;
 if(runtime.playerOut&&m.kind!=='battleRoyale'){
   runtime.playerRespawn-=dt;
   if(runtime.playerRespawn<=0){runtime.playerOut=false;respawn(p);game.life=100;game.over=false;push('Réapparition');}
 }
 for(const e of state.entities){if(e!==p&&e._modeRespawn&&runtime.elapsed>=e._modeRespawn)respawn(e)}
 if(m.kind==='roleplay'){
   runtime.payTimer+=dt;
   if(runtime.payTimer>=Math.max(3,Number(m.rolePayInterval)||25)){runtime.payTimer=0;runtime.money+=Math.max(0,Number(m.roleSalary)||0);push('Salaire +'+m.roleSalary+'$')}
 }
 if(m.kind==='battleRoyale'){
   const duration=Math.max(15,Number(m.zoneShrinkSeconds)||180),pct=Math.min(1,runtime.elapsed/duration);
   runtime.zoneRadius=(Number(m.zoneRadius)||650)+(Math.max(20,Number(m.zoneMinRadius)||85)-(Number(m.zoneRadius)||650))*pct;
   for(const e of state.entities.filter(participant)){
     if(e._modeEliminated)continue;
     const c=center(e),outside=Math.hypot(c.x-(Number(m.zoneX)||640),c.y-(Number(m.zoneY)||360))>runtime.zoneRadius;
     if(outside){
       const amount=(Number(m.zoneDamage)||8)*dt;
       if(e===p){game.life=Math.max(0,game.life-amount);if(game.life<=0)registerElimination(e,null,game)}
       else{e.hp=Math.max(0,(e.hp??100)-amount);if(e.hp<=0)registerElimination(e,null,game)}
     }
   }
 }
 if(m.kind==='frontline'){
   const rad=Math.max(30,Number(m.captureRadius)||115),cx=Number(m.captureX)||700,cy=Number(m.captureY)||340;
   const inside=state.entities.filter(e=>participant(e)&&!e._modeEliminated&&Math.hypot(center(e).x-cx,center(e).y-cy)<rad);
   const team1=inside.filter(e=>e.team===1).length,team2=inside.filter(e=>e.team===2).length,advantage=Math.sign(team1-team2);
   runtime.capture=Math.min(100,Math.max(-100,runtime.capture+advantage*dt*100/Math.max(2,Number(m.captureSeconds)||12)));
   const owner=runtime.capture>=100?1:runtime.capture<=-100?2:0;
   if(owner&&owner!==runtime.captureOwner){runtime.captureOwner=owner;push('Équipe '+owner+' contrôle le front')}
   if(runtime.captureOwner){runtime.captureScoring+=dt;if(runtime.captureScoring>=5){runtime.captureScoring=0;runtime.teamScores[runtime.captureOwner]+=(Math.max(1,Number(m.scorePerCapture)||2));if(runtime.teamScores[runtime.captureOwner]>=Math.max(1,Number(m.scoreLimit)||10))end('Front remporté par équipe '+runtime.captureOwner)}}
 }
 if(m.kind!=='roleplay'&&Number(m.timeLimit)>0&&runtime.elapsed>=Number(m.timeLimit)){
   if(m.kind==='battleRoyale')end('Temps écoulé — Survivants : '+state.entities.filter(e=>participant(e)&&!e._modeEliminated).length);
   else if(m.kind==='deathmatch')end('Fin de match — '+runtime.kills+' éliminations');
   else end('Temps écoulé — Score '+runtime.teamScores[1]+' : '+runtime.teamScores[2]);
 }
}
export function drawMode(ctx,w,h){
 const m=currentMode();if(!state.playing||!m)return;
 ctx.save();const c=state.camera;
 if(m.kind==='battleRoyale'){
   ctx.save();ctx.translate(c.x,c.y);ctx.scale(c.zoom,c.zoom);ctx.strokeStyle='#6af4db';ctx.lineWidth=4/c.zoom;ctx.setLineDash([16/c.zoom,9/c.zoom]);ctx.beginPath();ctx.arc(Number(m.zoneX)||640,Number(m.zoneY)||360,runtime.zoneRadius,0,Math.PI*2);ctx.stroke();ctx.restore();
 }
 if(m.kind==='frontline'){
   ctx.save();ctx.translate(c.x,c.y);ctx.scale(c.zoom,c.zoom);ctx.beginPath();ctx.arc(Number(m.captureX)||700,Number(m.captureY)||340,Math.max(30,Number(m.captureRadius)||115),0,Math.PI*2);ctx.fillStyle='#56a2dd33';ctx.fill();ctx.strokeStyle='#89dfcf';ctx.lineWidth=3/c.zoom;ctx.stroke();ctx.restore();
 }
 const title=modeNames[m.kind];ctx.fillStyle='#101b28eb';ctx.fillRect(w-276,12,262,92);ctx.fillStyle='#83e4d0';ctx.font='bold 13px system-ui';ctx.fillText(title,w-263,32);ctx.fillStyle='#fff';ctx.font='12px system-ui';
 const score=m.kind==='deathmatch'?'Kills '+runtime.kills+' / '+m.scoreLimit:
   m.kind==='battleRoyale'?'Survivants '+state.entities.filter(e=>participant(e)&&!e._modeEliminated).length+' • Rayon '+Math.round(runtime.zoneRadius):
   m.kind==='roleplay'?'Rôle '+runtime.role+' • '+runtime.money+'$':
   'Équipe 1 : '+runtime.teamScores[1]+'   Équipe 2 : '+runtime.teamScores[2];
 ctx.fillText(score,w-263,53);
 ctx.fillText(m.kind==='roleplay'?'R : changer de métier':m.kind==='frontline'?'Contrôle : '+Math.abs(Math.round(runtime.capture))+'% / équipe '+runtime.captureOwner:runtime.playerOut?'Réapparition '+Math.ceil(runtime.playerRespawn)+'s':'Temps '+Math.max(0,Math.ceil((Number(m.timeLimit)||240)-runtime.elapsed))+'s',w-263,73);
 if(runtime.roundOver){ctx.fillStyle='#07111ae6';ctx.fillRect(w/2-235,h/2-55,470,110);ctx.fillStyle='#b6ffe1';ctx.textAlign='center';ctx.font='bold 22px system-ui';ctx.fillText(runtime.winner,w/2,h/2);ctx.font='12px system-ui';ctx.fillText('Stop puis Play pour relancer',w/2,h/2+25)}
 for(let i=0;i<runtime.events.length;i++){ctx.fillStyle='#b2f3d8';ctx.font='11px system-ui';ctx.fillText(runtime.events[i].message,24,130+i*18)}
 ctx.restore();
}
export function bindModeInput(){window.addEventListener('keydown',e=>{if(!state.playing||e.repeat||e.key.toLowerCase()!=='r'||currentMode()?.kind!=='roleplay'||['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName))return;e.preventDefault();runtime.role=roleNames[(roleNames.indexOf(runtime.role)+1)%roleNames.length];push('Nouveau métier : '+runtime.role)})}
