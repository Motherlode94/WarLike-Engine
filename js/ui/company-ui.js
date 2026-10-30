import {state,notify} from '../core/state.js';
import {workspace} from '../core/workspaces.js';
import {gameIsRunning} from '../core/game-session.js';
import {gameplayInputBlocked} from '../core/gameplay-input.js';
import {isTypingTarget} from '../core/editor-clipboard.js';
import {companyController,companyMatch as match,resetCompany,tickCompany,commandCompany,selectedCompanySquads,selectCompanySquad,companySquadMembers,queueCompanyUnit,reinforceCompany,repairCompany} from '../core/company-runtime.js';
import {companyUnitTypes} from '../core/company-units.js';
import {healthOf} from '../core/ai-perception.js';
import {isLanGuest} from '../core/lan-state.js';
import {get3dAsset} from '../assets/catalog-3d.js';

const el=(tag,text,cls)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(cls)node.className=cls;return node};
const center=members=>({x:members.reduce((n,o)=>n+o.x+o.w/2,0)/members.length,y:members.reduce((n,o)=>n+o.y+(o.depth3d??o.h)/2,0)/members.length});
const select=id=>{state.selected=selectCompanySquad(state.entities,id);notify()};
let worldMarkers;
export function updateCompanyMarkers({camera,width,height,project}){
 const host=document.getElementById('viewport');if(!host)return;
 if(!worldMarkers){worldMarkers=el('div',undefined,'company-world-markers');host.append(worldMarkers)}
 worldMarkers.hidden=!state.playing||!match.active;if(worldMarkers.hidden)return;
 worldMarkers.replaceChildren();
 for(const squad of match.squads.values()){
  const members=companySquadMembers(squad.id,state.entities);if(!members.length)continue;
  const at=center(members),screen=project([at.x/64,2.6,at.y/64],camera,width,height);if(!screen||screen.x<0||screen.x>width||screen.y<0||screen.y>height)continue;
  const marker=el('button',companyUnitTypes[squad.role].label+' · '+members.length+'/'+squad.memberIds.length,'company-world-unit team-'+squad.team);marker.type='button';marker.disabled=squad.team!==1;marker.style.left=screen.x+'px';marker.style.top=screen.y+'px';marker.onclick=()=>select(squad.id);worldMarkers.append(marker);
 }
}
export function initCompanyUi(){
 const host=document.getElementById('viewport');if(!host||document.getElementById('companyHud'))return;
 const hud=el('section',undefined,'company-hud');hud.id='companyHud';hud.hidden=true;hud.setAttribute('aria-label','Commandement WarLike Company');
 const top=el('div',undefined,'company-top'),title=el('strong','WARLIKE COMPANY'),scores=el('span'),resources=el('span');
 const pause=el('button','Ⅱ Pause tactique'),mapToggle=el('button','▦ Carte tactique');for(const button of [pause,mapToggle])button.type='button';top.append(title,scores,resources,pause,mapToggle);
 const map=el('div',undefined,'company-minimap'),mapTitle=el('strong','Carte tactique · clic droit : ordre'),mapHint=el('small','Clic sur une unité bleue : sélection. Clic sur le terrain : caméra.');
 const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 3200 1920');svg.setAttribute('role','img');svg.setAttribute('aria-label','Carte des escouades et des territoires');map.append(mapTitle,mapHint,svg);
 const bottom=el('div',undefined,'company-bottom'),roster=el('div',undefined,'company-roster'),commands=el('div',undefined,'company-commands'),selection=el('span','Sélectionne une escouade.','company-selection');
 roster.setAttribute('aria-label','Mes escouades');const cardMap=new Map(),trainingButtons=[];
 const orders=el('div',undefined,'company-order-buttons');
 const action=(label,callback)=>{const button=el('button',label);button.type='button';button.onclick=callback;orders.append(button);return button};
 action('H · Tenir',()=>commandCompany(state.entities,state.selected,'hold'));
 action('R · Retraite',()=>commandCompany(state.entities,state.selected,'retreat'));
 action('＋ Renforcer · 25 effectifs',()=>reinforceCompany(state.entities,state.selected));
 action('⚒ Réparer · 10 munitions',()=>repairCompany(state.entities,state.selected));
 const sectors=el('div',undefined,'company-sector-buttons');
 const training=el('div',undefined,'company-training');training.append(el('strong','RECRUTEMENT AU QG'));
 for(const [role,type] of Object.entries(companyUnitTypes)){
  const button=el('button',type.label+' · '+type.manpower+' effectifs'+(type.fuel?' + '+type.fuel+' carburant':''));button.type='button';button.onclick=()=>queueCompanyUnit(state.entities,role);training.append(button);trainingButtons.push({button,role});
 }
 const queue=el('small','Aucun recrutement.');training.append(queue);commands.append(selection,orders,sectors,training);
 bottom.append(roster,commands);const notice=el('p','','company-notice');notice.setAttribute('role','status');hud.append(top,map,bottom,notice);host.append(hud);
 let activeSource=null,wasPlaying=false,last=performance.now(),renderAt=0,sectorSource=null;
 const usable=()=>state.playing&&workspace.mode==='3d'&&!!companyController(state.entities)&&!isLanGuest()&&!gameplayInputBlocked();
 pause.onclick=()=>{if(usable()&&match.winner===null)match.paused=!match.paused};
 mapToggle.onclick=()=>hud.classList.toggle('company-map-expanded');
 const focus=point=>document.dispatchEvent(new CustomEvent('warlike:company-focus',{detail:point}));
 const mapPoint=event=>{const point=svg.createSVGPoint();point.x=event.clientX;point.y=event.clientY;const matrix=svg.getScreenCTM();const local=matrix?point.matrixTransform(matrix.inverse()):point;return local.x>=0&&local.x<=3200&&local.y>=0&&local.y<=1920?{x:local.x,y:local.y}:null};
 svg.addEventListener('pointerdown',event=>{
  if(!usable()||event.button!==0)return;event.preventDefault();const id=Number(event.target.closest('[data-squad]')?.getAttribute('data-squad'));
  if(id){state.selected=selectCompanySquad(state.entities,id,{selected:state.selected,add:event.shiftKey});notify()}else {const point=mapPoint(event);if(point)focus(point)};
 });
 svg.addEventListener('contextmenu',event=>{
  event.preventDefault();if(!usable())return;const id=Number(event.target.closest('[data-squad]')?.getAttribute('data-squad')),squad=match.squads.get(id);
  if(squad?.team===2){const target=companySquadMembers(id,state.entities)[0];if(target)commandCompany(state.entities,state.selected,'attack',target.id)}
  else commandCompany(state.entities,state.selected,'move',mapPoint(event));
 });
 document.addEventListener('keydown',event=>{
  if(!usable()||isTypingTarget(event.target)||event.repeat)return;const key=event.key.toLowerCase();
  if(key===' '){event.preventDefault();pause.click()}
  else if(key==='r'){event.preventDefault();commandCompany(state.entities,state.selected,'retreat')}
  else if(key==='h'){event.preventDefault();commandCompany(state.entities,state.selected,'hold')}
  else if(key==='home'){event.preventDefault();const base=state.entities.find(o=>o.companyBase?.team===1);if(base)focus(center([base]))}
  else if(/^[1-9]$/.test(key)){
   event.preventDefault();if(event.ctrlKey||event.metaKey)match.groups[key]=[...state.selected];else{const group=match.groups[key];state.selected=group?group.filter(id=>state.entities.some(o=>o.id===id&&healthOf(o)>0)):[...match.squads.values()].filter(s=>s.team===1)[Number(key)-1]?.memberIds.filter(id=>state.entities.some(o=>o.id===id&&healthOf(o)>0))||[];notify()}
  }
 });
 const shape=(tag,attributes)=>{const node=document.createElementNS(ns,tag);for(const [name,value] of Object.entries(attributes))node.setAttribute(name,String(value));return node};
 function drawMap(){
  svg.replaceChildren(shape('rect',{x:0,y:0,width:3200,height:1920,fill:'#263c36'}));
  svg.append(shape('path',{d:'M0 900 H3200 M1600 0 V1920',stroke:'#556452','stroke-width':100,fill:'none'}));
  for(const building of state.entities.filter(o=>!o.companyBase&&get3dAsset(o.model3dId||o.assetId)?.category==='Buildings'))svg.append(shape('rect',{x:building.x,y:building.y,width:building.w,height:building.depth3d||building.w,fill:'#6f7668',stroke:'#b4b5a2','stroke-width':6}));
  for(const cover of state.entities.filter(o=>o.companyCover))svg.append(shape('rect',{x:cover.x,y:cover.y,width:cover.w,height:cover.depth3d||45,fill:'#c7b57a'}));
  for(const point of match.sectors){
   for(const link of point.links||[]){const other=match.sectors.find(p=>p.id===link)||state.entities.filter(o=>o.companyBase&&'base'+o.team===link).map(o=>center([o]))[0];if(other)svg.append(shape('line',{x1:point.x,y1:point.y,x2:other.x,y2:other.y,stroke:'#667b6c','stroke-width':8}))}
   const color=point.owner===1?'#5eaeec':point.owner===2?'#ee9673':'#e0d6b4';svg.append(shape('circle',{cx:point.x,cy:point.y,r:200,fill:color,'fill-opacity':.18,stroke:color,'stroke-width':8}));const label=shape('text',{x:point.x,y:point.y+25,'text-anchor':'middle',fill:'#fff','font-size':90,'font-weight':700});label.textContent=point.id;svg.append(label);
  }
  for(const base of state.entities.filter(o=>o.companyBase)){svg.append(shape('rect',{x:base.x,y:base.y,width:base.w,height:base.depth3d,fill:base.team===1?'#5cb9ff':'#ef9b79'}))}
  for(const squad of match.squads.values()){const members=companySquadMembers(squad.id,state.entities);if(!members.length)continue;const at=center(members),selected=members.some(o=>state.selected.includes(o.id));const marker=shape('circle',{cx:at.x,cy:at.y,r:squad.role==='tank'?55:40,fill:squad.team===1?'#6ac3ff':'#ff9a74',stroke:selected?'#fff':'#152b27','stroke-width':selected?18:7,'data-squad':squad.id});svg.append(marker)}
 }
 function render(){
  const r=match.resources[1];scores.textContent='BLEU '+Math.ceil(match.points[1])+' : '+Math.ceil(match.points[2])+' ORANGE';resources.textContent=Math.floor(r.manpower)+' effectifs · '+Math.floor(r.munitions)+' munitions · '+Math.floor(r.fuel)+' carburant';
  pause.textContent=match.paused?'▶ Reprendre':'Ⅱ Pause tactique';pause.setAttribute('aria-pressed',String(match.paused));pause.disabled=match.winner!==null;
  const chosen=selectedCompanySquads(state.entities,state.selected);selection.textContent=chosen.length?chosen.length+' escouade(s) · '+chosen.map(s=>s.name+(s.retreating?' (retraite)':'')).join(', '):'Sélectionne une escouade bleue.';
  for(const squad of [...match.squads.values()].filter(s=>s.team===1)){
   if(!cardMap.has(squad.id)){const card=el('button');card.type='button';card.onclick=event=>{state.selected=selectCompanySquad(state.entities,squad.id,{selected:state.selected,add:event.shiftKey});notify()};roster.append(card);cardMap.set(squad.id,card)}
   const card=cardMap.get(squad.id),members=companySquadMembers(squad.id,state.entities),suppressed=members.some(o=>o.companyUnit.suppression>=.6),hp=Math.round(members.reduce((sum,o)=>sum+healthOf(o),0));
   card.textContent=squad.name+' · '+members.length+'/'+squad.memberIds.length+' · '+hp+' PV'+(squad.retreating?' · RETRAITE':suppressed?' · SOUS LE FEU':'');card.disabled=!members.length;card.setAttribute('aria-pressed',String(members.some(o=>state.selected.includes(o.id))));
  }
  for(const {button,role} of trainingButtons){const type=companyUnitTypes[role];button.disabled=match.winner!==null||r.manpower<type.manpower||r.fuel<type.fuel||match.queues[1].length>=3}
  queue.textContent=match.queues[1].length?'En préparation : '+match.queues[1].map(j=>companyUnitTypes[j.role].label+' '+Math.ceil(j.remaining)+' s').join(' → '):'Aucun recrutement · 8 escouades maximum.';
  if(sectorSource!==match.sectors){sectorSource=match.sectors;sectors.replaceChildren();for(const point of match.sectors){const button=el('button',point.name);button.type='button';button.onclick=()=>commandCompany(state.entities,state.selected,'move',point);button.dataset.sector=point.id;sectors.append(button)}}
  for(const button of sectors.children){const point=match.sectors.find(p=>p.id===button.dataset.sector);button.textContent=point.id+' · '+(point.contested?'contesté':point.owner===1?'bleu':point.owner===2?'orange':'neutre')+(point.owner&&!point.connected?' · isolé':'');button.title='Capturer '+point.name;button.disabled=match.winner!==null}
  const graphicsUnavailable=document.getElementById('webglFailure')?.hidden===false;
  mapHint.textContent=graphicsUnavailable?'Affichage 3D indisponible ici · carte tactique interactive.':'Clic bleu : sélection · clic terrain : caméra · clic droit : ordre.';
  notice.textContent=match.winner!==null?(match.winner===0?'ÉGALITÉ':match.winner===1?'VICTOIRE DE LA COMPAGNIE BLEUE':'DÉFAITE')+' · Stop puis Play pour rejouer.':match.paused?'PAUSE TACTIQUE · prépare tes ordres puis reprends la bataille.':match.elapsed<match.messageUntil?match.message:'Flèches / ZQSD : caméra · molette : zoom · R : retraite · H : tenir · Ctrl+1–9 : groupes.';
  drawMap();
 }
 function frame(now){
  requestAnimationFrame(frame);const dt=Math.min(.1,Math.max(0,(now-last)/1000));last=now;
  const playing=state.playing&&workspace.mode==='3d'&&!!companyController(state.entities)&&!isLanGuest();hud.hidden=!playing;
  if(!playing){if(wasPlaying||match.active)resetCompany([]);wasPlaying=false;activeSource=null;return}
  if(!wasPlaying||activeSource!==state.entities){resetCompany(state.entities);activeSource=state.entities;wasPlaying=true;cardMap.clear();roster.replaceChildren();sectorSource=null;hud.classList.toggle('company-map-expanded',document.getElementById('webglFailure')?.hidden===false)}
  if(document.hidden)return;
  if(gameIsRunning())tickCompany(state.entities,dt);state.nextId=Math.max(state.nextId,match.nextId);
  if(now-renderAt>160){renderAt=now;render()}
 }
 requestAnimationFrame(frame);
}
