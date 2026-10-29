import {battlefieldMatch as match} from '../core/battlefield-runtime.js';
import {healthOf} from '../core/ai-perception.js';
let hud,markers,lastHudVersion='';
export function updateBattlefieldHud(state,{camera=null,width=0,height=0,project=null}={}){
 const host=document.getElementById('viewport');if(!host)return;
 if(!hud){hud=document.createElement('div');hud.className='warlike-battlefield-hud';hud.setAttribute('aria-label','État de la bataille');host.append(hud);markers=document.createElement('div');markers.className='warlike-battlefield-markers';host.append(markers)}
 const player=state.entities.find(o=>o.id===match.playerId);
 hud.hidden=markers.hidden=!state.playing||!match.active||!player?.battlefield?.enabled;if(hud.hidden)return;
 const text=(tag,value,className='')=>{const node=document.createElement(tag);node.textContent=value;node.className=className;return node};
 const time=Math.max(0,(Number(player.battlefield.timeLimit)||480)-match.elapsed),dead=match.dead.has(player.id);
 const version=JSON.stringify([Math.ceil(match.tickets[1]),Math.ceil(match.tickets[2]),Math.floor(time),match.sectors.map(p=>[p.owner,p.contested,Math.round(p.progress*100)]),dead?Math.ceil(match.dead.get(player.id)-match.elapsed):null,Math.round(healthOf(player)),match.ammo,match.reserve,match.reloading,match.reload.toFixed(1),match.winner,match.kills,match.deaths]);
 if(version!==lastHudVersion){lastHudVersion=version;
 const score=text('div','');score.className='battlefield-score';score.append(text('strong','BLEU '+Math.ceil(match.tickets[1]),'blue'),text('span','CONQUÊTE · '+Math.floor(time/60)+':'+String(Math.floor(time%60)).padStart(2,'0')),text('strong',Math.ceil(match.tickets[2])+' ORANGE','orange'));
 const sectors=text('div','');sectors.className='battlefield-sectors';
 for(const sector of match.sectors)sectors.append(text('span',sector.name+' · '+(sector.contested?'CONTESTÉ':sector.owner===1?'BLEU':sector.owner===2?'ORANGE':'NEUTRE')+' · '+Math.round(Math.abs(sector.progress)*100)+'%',sector.owner===1?'blue':sector.owner===2?'orange':''));
 const status=match.winner!==null?(match.winner===0?'ÉGALITÉ':match.winner===player.team?'VICTOIRE':'DÉFAITE')+' · Stop puis Play pour rejouer':dead?'RÉAPPARITION · '+Math.max(0,Math.ceil(match.dead.get(player.id)-match.elapsed))+' s':
  'PV '+Math.round(healthOf(player))+' · '+(match.reloading?'RECHARGEMENT '+match.reload.toFixed(1)+' s':match.ammo+' / '+match.reserve+' MUN.')+' · '+match.kills+' élim. / '+match.deaths+' morts';
 hud.replaceChildren(score,sectors,text('div',status,'battlefield-status'),text('small','Souris : viser · clic/F : tirer · R : recharger · E : véhicule · F : canon · Échap : souris libre'));
 }
 if(camera&&project){markers.replaceChildren();for(const sector of match.sectors){const at=project([sector.x/64,3.2,sector.y/64],camera,width,height);if(!at||at.x<0||at.x>width||at.y<0||at.y>height)continue;const marker=text('span',sector.name+' · '+Math.round(Math.hypot(sector.x-player.x,sector.y-player.y)/64)+' m');marker.className='battlefield-marker '+(sector.owner===1?'blue':sector.owner===2?'orange':'');marker.style.left=at.x+'px';marker.style.top=at.y+'px';markers.append(marker)}}
}
