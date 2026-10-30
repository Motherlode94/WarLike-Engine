import {healthOf,hasLineOfSight} from './ai-perception.js';
import {damage,setHealth} from './gameplay-components.js';
import {orderRtsMove,updateRtsOrders} from './rts-orders.js';
import {makeCompanySquad,companyUnitTypes} from './company-units.js';
import {emitFx} from './fx-runtime.js';
import {solidBody3d,collisionBox3d,boxesOverlap3d} from './collision-3d.js';

const number=(value,fallback=0)=>Number.isFinite(Number(value))?Number(value):fallback;
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
const center=o=>({x:o.x+o.w/2,y:o.y+(o.depth3d??o.h)/2});
const distance=(a,b)=>{const x=center(a),y=center(b);return Math.hypot(x.x-y.x,x.y-y.y)};
export const companyController=entities=>entities.find(o=>o.company?.enabled===true)||null;
export const companyMatch={active:false,paused:false,elapsed:0,winner:null,points:{1:180,2:180},resources:{},squads:new Map(),sectors:[],queues:{1:[],2:[]},nextId:1,message:'',messageUntil:0,aiTimer:0,trainTimer:0,groups:{}};
let source=null;
const announce=text=>{companyMatch.message=text;companyMatch.messageUntil=companyMatch.elapsed+4};
const live=(squad,entities)=>entities.filter(o=>squad.memberIds.includes(o.id)&&healthOf(o)>0&&o.sequenceEnabled!==false);
export const companySquadMembers=(id,entities)=>{const squad=companyMatch.squads.get(id);return squad?live(squad,entities):[]};
const average=members=>members.length?{x:members.reduce((n,o)=>n+center(o).x,0)/members.length,y:members.reduce((n,o)=>n+center(o).y,0)/members.length}:null;
function register(members){
 const first=members[0],id=first.companyUnit.squadId;
 companyMatch.squads.set(id,{id,team:first.team,role:first.companyUnit.role,name:companyUnitTypes[first.companyUnit.role].label+' '+id,memberIds:members.map(o=>o.id),order:{type:'hold'},retreating:false});
}
function deployment(entities,role,team,base){
 const at=center(base),type=companyUnitTypes[role];
 for(const row of [0,1,2,3])for(const column of [0,-1,1]){
  const x=at.x-50+column*330,y=at.y+number(base.companyBase.exitY,250)+row*190;
  if(x<0||x+(role==='tank'?235:225)>3200||y+150>1900)continue;
  const members=makeCompanySquad(role,team,companyMatch.nextId,x,y);
  if(members.every(member=>!entities.some(o=>solidBody3d(o)&&healthOf(o)>0&&boxesOverlap3d(collisionBox3d(member),collisionBox3d(o)))))return members;
 }return null;
}
export function resetCompany(entities){
 source=entities;const controller=companyController(entities),cfg=controller?.company;
 Object.assign(companyMatch,{active:!!cfg,paused:false,elapsed:0,winner:null,points:{1:180,2:180},resources:{1:{manpower:300,munitions:60,fuel:65},2:{manpower:300,munitions:60,fuel:65}},squads:new Map(),sectors:[],queues:{1:[],2:[]},nextId:Math.max(0,...entities.map(o=>o.id))+1,message:'',messageUntil:0,aiTimer:0,trainTimer:0,groups:{}});
 if(!cfg)return;
 const points=clamp(number(cfg.victoryPoints,180),1,2000);companyMatch.points={1:points,2:points};
 const grouped=new Map();
 for(const unit of entities){if(!unit.companyUnit||!Object.hasOwn(companyUnitTypes,unit.companyUnit.role)||![1,2].includes(unit.team))continue;
  const id=unit.companyUnit.squadId;if(!Number.isSafeInteger(id)||id<=0)continue;
  if(!grouped.has(id))grouped.set(id,[]);grouped.get(id).push(unit);unit.companyUnit.suppression=0;unit.companyUnit.cooldown=0;
 }
 for(const members of grouped.values())register(members);
 companyMatch.sectors=(Array.isArray(cfg.sectors)?cfg.sectors:[]).slice(0,12).filter(p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&typeof p.id==='string').map(p=>({...structuredClone(p),owner:p.owner===1?1:p.owner===2?2:0,progress:p.owner===1?1:p.owner===2?-1:0,contested:false,connected:false}));
 announce('Capture les secteurs. Préserve tes escouades : R pour la retraite, puis Renforcer au QG.');
}
export function selectedCompanySquads(entities,ids,team=1){
 return [...companyMatch.squads.values()].filter(s=>s.team===team&&s.memberIds.some(id=>ids.includes(id))&&live(s,entities).length);
}
export function selectCompanySquad(entities,squadId,{selected=[],add=false,team=1}={}){
 const squad=companyMatch.squads.get(squadId);if(!squad||squad.team!==team)return selected;
 const ids=live(squad,entities).map(o=>o.id);
 return add?[...new Set([...selected,...ids])]:ids;
}
function moveSquad(squad,entities,point){
 const members=live(squad,entities),at=average(members);if(!at||Math.hypot(at.x-point.x,at.y-point.y)<45)return;
 if(members.some(o=>o.rtsOrder?.type==='move'&&Math.hypot(o.rtsOrder.x-point.x,o.rtsOrder.y-point.y)<200))return;
 orderRtsMove(entities,members.map(o=>o.id),point);
}
export function commandCompany(entities,ids,type,target=null,team=1){
 if(!companyMatch.active||companyMatch.winner!==null)return 0;
 const controller=companyController(entities),bounds=controller?.company?.bounds||{minX:0,maxX:3000,minY:0,maxY:1800};
 const squads=selectedCompanySquads(entities,ids,team);let count=0;
 for(const [index,squad] of squads.entries()){
  if(squad.retreating&&type!=='retreat')continue;
  const members=live(squad,entities);
  if(type==='move'){
   if(!target||![target.x,target.y].every(Number.isFinite))continue;
   squad.order={type:'move',x:clamp(target.x+(index-(squads.length-1)/2)*300,bounds.minX,bounds.maxX),y:clamp(target.y,bounds.minY,bounds.maxY)};
   for(const member of members){delete member.rtsOrder;delete member._rtsPath}moveSquad(squad,entities,squad.order);
  }else if(type==='attack'){
   const enemy=entities.find(o=>o.id===target);if(!enemy||enemy.team===team||!enemy.team||healthOf(enemy)<=0||(!enemy.companyUnit&&!enemy.companyBase))continue;
   squad.order={type:'attack',targetId:enemy.id};
  }else if(type==='retreat'){
   const base=entities.find(o=>o.companyBase?.team===team);if(!base)continue;
   const at=center(base);squad.retreating=true;squad.order={type:'retreat',x:at.x+number(base.companyBase.exitX),y:at.y+number(base.companyBase.exitY,250)};
   for(const member of members){delete member.rtsOrder;delete member._rtsPath}moveSquad(squad,entities,squad.order);
  }else if(type==='hold'){
   squad.order={type:'hold'};for(const member of members){member.rtsOrder={type:'hold'};delete member._rtsPath}
  }else continue;
  count++;
 }
 if(count&&team===1)announce(({move:'Déplacement',attack:'Attaque',retreat:'Retraite au QG',hold:'Position tenue'})[type]+' · '+count+' escouade(s)');
 return count;
}
export function queueCompanyUnit(entities,role,team=1){
 if(!companyMatch.active||companyMatch.winner!==null||!Object.hasOwn(companyUnitTypes,role)||![1,2].includes(team))return false;
 const rt=companyMatch,type=companyUnitTypes[role],r=rt.resources[team],queue=rt.queues[team];
 const count=[...rt.squads.values()].filter(s=>s.team===team&&live(s,entities).length).length;
 if(queue.length>=3||count+queue.length>=8||entities.length+type.members>220){if(team===1)announce('Limite atteinte : 8 escouades, 3 recrutements en attente.');return false}
 if(r.manpower<type.manpower||r.fuel<type.fuel){if(team===1)announce('Ressources insuffisantes pour '+type.label+'.');return false}
 r.manpower-=type.manpower;r.fuel-=type.fuel;queue.push({role,remaining:type.seconds});if(team===1)announce(type.label+' en préparation au QG.');return true;
}
export function reinforceCompany(entities,ids,team=1){
 const base=entities.find(o=>o.companyBase?.team===team);if(!base||companyMatch.winner!==null)return 0;let count=0;
 for(const squad of selectedCompanySquads(entities,ids,team)){
  const living=live(squad,entities);if(squad.role==='tank'||!living.some(o=>distance(o,base)<360))continue;
  for(const id of squad.memberIds){const member=entities.find(o=>o.id===id);if(!member||healthOf(member)>0||companyMatch.resources[team].manpower<25)continue;
   const anchor=living[0];companyMatch.resources[team].manpower-=25;member.x=anchor.x+(count%2)*130;member.y=anchor.y+100+Math.floor(count/2)*85;
   setHealth(member,member.stats?.maxHealth||100);member._modeEliminated=false;member.companyUnit.suppression=0;delete member.rtsOrder;count++;
  }
 }
 if(team===1)announce(count?count+' soldat(s) renforcé(s).':'Rejoins le QG avec un survivant · 25 effectifs par soldat.');return count;
}
export function repairCompany(entities,ids,team=1){
 if(!companyMatch.active||![1,2].includes(team)||companyMatch.winner!==null||companyMatch.resources[team].munitions<10)return false;
 const engineers=selectedCompanySquads(entities,ids,team).filter(s=>s.role==='engineer').flatMap(s=>live(s,entities));
 const tank=entities.find(o=>o.team===team&&o.companyUnit?.role==='tank'&&healthOf(o)>0&&healthOf(o)<o.stats.maxHealth&&engineers.some(e=>distance(e,o)<250));
 if(!tank){if(team===1)announce('Approche le Génie d’un blindé endommagé · 10 munitions.');return false}
 companyMatch.resources[team].munitions-=10;setHealth(tank,healthOf(tank)+60);if(team===1)announce('Blindé réparé : +60 PV.');return true;
}
export function companyCoverProtection(attacker,target,entities){
 if(target.companyUnit?.role==='tank')return 0;
 const from=center(attacker),to=center(target),dx=from.x-to.x,dy=from.y-to.y,d=Math.hypot(dx,dy)||1;let protection=0;
 for(const cover of entities){const cfg=cover.companyCover;if(!cfg||cfg.enabled===false||cover._sequenceDestroyed)continue;
  const p=center(cover),cx=p.x-to.x,cy=p.y-to.y,near=Math.hypot(cx,cy);
  if(near<=number(cfg.radius,160)&&near<d&&(cx*dx+cy*dy)/(Math.max(1,near)*d)>.35)
   protection=Math.max(protection,clamp(number(cfg.protection,.55),0,.8));
 }return protection;
}
function connectivity(team,sectors){
 const reached=new Set(['base'+team]);let changed=true;
 while(changed){changed=false;for(const point of sectors){if(point.owner!==team||reached.has(point.id))continue;if((point.links||[]).some(id=>reached.has(id))){reached.add(point.id);changed=true}}}
 return reached;
}
export function tickCompany(entities,dt){
 if(source!==entities)resetCompany(entities);
 const rt=companyMatch;if(!rt.active||rt.paused||rt.winner!==null||!Number.isFinite(dt)||dt<=0)return;
 const frame=Math.min(dt,.1),controller=companyController(entities);if(!controller)return;rt.elapsed+=frame;
 const units=entities.filter(o=>o.companyUnit&&healthOf(o)>0&&o.sequenceEnabled!==false),bySquad=new Map();
 for(const squad of rt.squads.values())bySquad.set(squad.id,live(squad,entities));
 for(const unit of entities.filter(o=>o.companyUnit)){if(healthOf(unit)<=0){unit._modeEliminated=true;delete unit.rtsOrder;continue}
  const cfg=unit.companyUnit,squad=rt.squads.get(cfg.squadId),type=companyUnitTypes[cfg.role];if(!squad||!type)continue;
  cfg.cooldown=Math.max(0,number(cfg.cooldown)-frame);cfg.suppression=clamp(number(cfg.suppression)-frame*.1,0,1.5);
  unit.elevation3d=0;
  unit.tacticalUnit.speed=type.speed*(squad.retreating?1.65:cfg.suppression>=1?.2:cfg.suppression>=.6?.5:1);
 }
 for(const squad of rt.squads.values()){
  const members=bySquad.get(squad.id),at=average(members);if(!at)continue;
  if(squad.retreating&&Math.hypot(at.x-squad.order.x,at.y-squad.order.y)<190){squad.retreating=false;squad.order={type:'hold'};for(const member of members){member.rtsOrder={type:'hold'};member.companyUnit.suppression=0}}
  if(squad.order.type==='attack'){
   const target=entities.find(o=>o.id===squad.order.targetId&&healthOf(o)>0);if(!target){squad.order={type:'hold'};continue}
   const to=center(target),range=companyUnitTypes[squad.role].range;
   if(Math.hypot(at.x-to.x,at.y-to.y)>range*.85)moveSquad(squad,entities,to);
   else for(const member of members)member.rtsOrder={type:'hold'};
  }else if(['move','retreat'].includes(squad.order.type))moveSquad(squad,entities,squad.order);
  const base=entities.find(o=>o.companyBase?.team===squad.team);
  if(base&&members.some(o=>distance(o,base)<360)&&!squad.retreating)for(const member of members)setHealth(member,healthOf(member)+frame*5);
 }
 updateRtsOrders(entities,frame,true,{mode:'3d',passFriendlyUnits:true});
 for(const unit of units)unit.elevation3d=0;
 // Directional cover and suppression apply only to this prototype's combat.
 for(const unit of units){
  const cfg=unit.companyUnit,squad=rt.squads.get(cfg.squadId),type=companyUnitTypes[cfg.role];if(!squad||squad.retreating||cfg.cooldown>0||healthOf(unit)<=0)continue;
  const forced=squad.order.type==='attack'?entities.find(o=>o.id===squad.order.targetId):null;
  const options=(forced?[forced]:units).filter(o=>o&&o!==unit&&o.team!==unit.team&&healthOf(o)>0&&distance(unit,o)<=type.range&&hasLineOfSight(unit,o,entities));
  const target=options.sort((a,b)=>distance(unit,a)-distance(unit,b))[0];if(!target)continue;
  const protection=companyCoverProtection(unit,target,entities),targetSquad=rt.squads.get(target.companyUnit?.squadId),armor=target.companyUnit?.role==='tank';
  const amount=type.damage*(armor&&cfg.role!=='tank'?.16:1)*(1-protection)*(cfg.suppression>=.6?.5:1)*(targetSquad?.retreating?.65:1);
  damage(target,amount);cfg.cooldown=type.interval;unit.animation='attack';target._companyCover=protection;
  if(target.companyUnit&&!armor)target.companyUnit.suppression=clamp(number(target.companyUnit.suppression)+type.suppression*(1-protection),0,1.5);
  const a=center(unit),b=center(target);emitFx('electric',{x:a.x,y:a.y,z:(unit.elevation3d||0)*64+unit.h*.6},{mode:'3d',count:2,speed:0,lifetime:.13,color:'#ffd28a'});
  for(const t of [.3,.6,.9])emitFx('electric',{x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:target.h*.55},{mode:'3d',count:1,speed:0,lifetime:.13,color:'#f8d98a'});
 }
 const radius=clamp(number(controller.company.captureRadius,210),60,350),captureSeconds=clamp(number(controller.company.captureSeconds,8),2,40);
 for(const sector of rt.sectors){
  const nearby=units.filter(o=>o.companyUnit.role!=='tank'&&healthOf(o)>0&&!rt.squads.get(o.companyUnit.squadId)?.retreating&&o.companyUnit.suppression<1&&Math.hypot(center(o).x-sector.x,center(o).y-sector.y)<=radius);
  const teams=new Set(nearby.map(o=>o.team));sector.contested=teams.size>1;
  if(teams.size===1){const team=[...teams][0];sector.progress=clamp(sector.progress+(team===1?1:-1)*frame/captureSeconds,-1,1);
   if(sector.progress===1)sector.owner=1;else if(sector.progress===-1)sector.owner=2;else if(sector.owner===1&&sector.progress<=0||sector.owner===2&&sector.progress>=0)sector.owner=0;
  }
 }
 for(const team of [1,2]){
  const connected=connectivity(team,rt.sectors),r=rt.resources[team];r.manpower=Math.min(9999,r.manpower+frame*2);
  for(const point of rt.sectors){if(point.owner!==team)continue;point.connected=connected.has(point.id);if(!point.connected)continue;const resource=point.kind==='munitions'?'munitions':point.kind==='fuel'?'fuel':'manpower';r[resource]=Math.min(9999,r[resource]+frame*(resource==='manpower'?1:.6))}
  const queue=rt.queues[team];if(queue.length){queue[0].remaining=Math.max(0,queue[0].remaining-frame);if(queue[0].remaining<=0){
   const job=queue[0],base=entities.find(o=>o.companyBase?.team===team);if(base&&healthOf(base)>0){const members=deployment(entities,job.role,team,base);if(members){queue.shift();rt.nextId+=members.length;entities.push(...members);register(members);if(team===1)announce(companyUnitTypes[job.role].label+' déployé(s) au QG.')}}
  }}
 }
 const owned=team=>rt.sectors.filter(o=>o.kind==='victory'&&o.owner===team).length,a=owned(1),b=owned(2);
 if(a!==b)rt.points[a>b?2:1]=Math.max(0,rt.points[a>b?2:1]-frame*.5*Math.abs(a-b));
 const bases=entities.filter(o=>o.companyBase);
 if(rt.points[1]<=0||rt.points[2]<=0||bases.some(o=>healthOf(o)<=0)||rt.elapsed>=clamp(number(controller.company.timeLimit,600),30,3600)){
  rt.winner=bases.find(o=>healthOf(o)<=0)?(bases.find(o=>healthOf(o)<=0).team===1?2:1):rt.points[1]===rt.points[2]?0:rt.points[1]>rt.points[2]?1:2;return;
 }
 rt.aiTimer-=frame;rt.trainTimer-=frame;
 if(rt.aiTimer<=0){rt.aiTimer=1;
  for(const squad of [...rt.squads.values()].filter(s=>s.team===2)){
   const members=live(squad,entities),at=average(members);if(!at||squad.retreating)continue;
   const hp=members.reduce((v,o)=>v+healthOf(o)/(o.stats?.maxHealth||100),0)/members.length;
   if(hp<.3||members.some(o=>o.companyUnit.suppression>1.1)){commandCompany(entities,members.map(o=>o.id),'retreat',null,2);continue}
   const base=bases.find(o=>o.team===2);if(base&&members.some(o=>distance(o,base)<360)){reinforceCompany(entities,members.map(o=>o.id),2);if(hp<.75)continue}
   const options=rt.sectors.filter(p=>p.owner!==2),target=options.sort((a,b)=>Math.hypot(a.x-at.x,a.y-at.y)-Math.hypot(b.x-at.x,b.y-at.y))[0];
   if(target&&(!['move','attack'].includes(squad.order.type)||Math.hypot(number(squad.order.x)-target.x,number(squad.order.y)-target.y)>200))commandCompany(entities,members.map(o=>o.id),'move',target,2);
  }
 }
 if(rt.trainTimer<=0){rt.trainTimer=25;queueCompanyUnit(entities,rt.resources[2].fuel>=60&&rt.resources[2].manpower>=380?'tank':'rifle',2)}
}
