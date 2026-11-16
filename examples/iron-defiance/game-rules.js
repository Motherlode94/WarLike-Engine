// Iron Defiance — deterministic game rules, no graphics or browser dependencies.
export const MAP = {width:72,height:58,cell:2};
export const MISSION_KEY='warlike.iron-defiance.cendre01.v1';
export const obstacles=[
 {x:-28,z:-18,w:9,d:8,h:5,cover:0.62,type:'building'},
 {x:-26,z:7,w:10,d:9,h:6,cover:0.65,type:'building'},
 {x:-8,z:-23,w:13,d:6,h:4,cover:0.6,type:'building'},
 {x:8,z:14,w:13,d:8,h:6,cover:0.65,type:'building'},
 {x:25,z:-18,w:12,d:8,h:5,cover:0.6,type:'building'},
 {x:23,z:18,w:9,d:8,h:5,cover:0.6,type:'building'},
 {x:-12,z:0,w:3,d:2,h:1.5,cover:0.45,type:'barricade'},
 {x:12,z:-8,w:3,d:2,h:1.5,cover:0.45,type:'barricade'},
 {x:17,z:7,w:3,d:2,h:1.5,cover:0.45,type:'barricade'},
 {x:-3,z:12,w:3,d:2,h:1.5,cover:0.45,type:'barricade'},
 {x:-20,z:21,w:4,d:2,h:1.4,cover:0.5,type:'barricade'},
 {x:1,z:-15,w:3,d:2,h:1.4,cover:0.45,type:'barricade'}
];
export const specs=Object.freeze({
 infantry:{speed:4.8,radius:.42,range:12,damage:9,rate:.55,ammo:28,mag:28,reserve:84,hp:90,armor:0,projectileSpeed:33},
 medic:{speed:4.5,radius:.43,range:10,damage:5,rate:.75,ammo:24,mag:24,reserve:72,hp:90,armor:0,projectileSpeed:28},
 engineer:{speed:4.2,radius:.45,range:11,damage:7,rate:.65,ammo:25,mag:25,reserve:80,hp:100,armor:0,projectileSpeed:29},
 apc:{speed:5.8,radius:1.28,range:17,damage:15,rate:.7,ammo:35,mag:35,reserve:100,hp:300,armor:7,projectileSpeed:43},
 tank:{speed:3.8,radius:1.65,range:22,damage:55,rate:2.8,ammo:7,mag:7,reserve:14,hp:440,armor:23,projectileSpeed:36},
 scout:{speed:7,radius:1,range:15,damage:12,rate:.6,ammo:30,mag:30,reserve:75,hp:210,armor:5,projectileSpeed:45},
 supply:{speed:4.3,radius:1.3,range:0,damage:0,rate:1,ammo:0,mag:0,reserve:0,hp:280,armor:5,projectileSpeed:0},
 convoy:{speed:3.2,radius:1.4,range:0,damage:0,rate:1,ammo:0,mag:0,reserve:0,hp:300,armor:3,projectileSpeed:0},
 drone:{speed:5.8,radius:.8,range:13,damage:12,rate:1.1,ammo:100,mag:100,reserve:0,hp:100,armor:2,projectileSpeed:35},
 bot:{speed:3.8,radius:.55,range:11,damage:8,rate:.85,ammo:100,mag:100,reserve:0,hp:115,armor:3,projectileSpeed:28},
 enemyArmor:{speed:2.9,radius:1.5,range:19,damage:25,rate:2.1,ammo:30,mag:30,reserve:0,hp:300,armor:11,projectileSpeed:35}
});
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const unit=(id,team,type,x,z)=>{const s=specs[type];return {id,team,type,x,z,radius:s.radius,hp:s.hp,ammo:s.ammo,reserve:s.reserve,reload:0,cooldown:0,yaw:0,order:null,path:[],pathAge:0,vet:0,selected:false,alive:true,component:{tracks:100,engine:100,weapon:100},service:0};};
export function createMission(){
 const units=[
 unit('alpha1','friendly','infantry',-26,-3),unit('alpha2','friendly','infantry',-24,-4),
 unit('alpha3','friendly','medic',-25,-6),unit('alpha4','friendly','engineer',-28,-6),
 unit('apc','friendly','apc',-30,-10),unit('tank','friendly','tank',-20,-13),
 unit('supply','friendly','supply',-33,-10),unit('convoy','friendly','convoy',-33,-25),
 unit('drone1','enemy','drone',8,-8),unit('drone2','enemy','drone',19,-1),
 unit('bot1','enemy','bot',2,3),unit('bot2','enemy','bot',18,13),
 unit('bot3','enemy','bot',25,-8),unit('armor1','enemy','enemyArmor',27,2)
 ];
 return {version:1,phase:'playing',time:0,units,shots:[],kills:0,losses:0,orders:0,
  objective:'Sécurisez la route, protégez le convoi et atteignez la zone d’extraction.',
  message:'Opération CENDRE-01 commencée.',convoyRoute:[{x:-20,z:-25},{x:-10,z:-18},{x:0,z:-8},{x:4,z:4},{x:17,z:21},{x:29,z:22}],routeIndex:0,escortEnabled:true,extraction:{x:29,z:22,r:5},result:null};
}
export const live=m=>m.units.filter(u=>u.alive);
export function walkable(x,z,r=.5){
 if(x< -MAP.width/2+r||x>MAP.width/2-r||z< -MAP.height/2+r||z>MAP.height/2-r)return false;
 return !obstacles.some(o=>Math.abs(x-o.x)<o.w/2+r && Math.abs(z-o.z)<o.d/2+r);
}
export function coverAt(u){
 let c=0;for(const o of obstacles){const dx=Math.abs(u.x-o.x)-o.w/2,dz=Math.abs(u.z-o.z)-o.d/2;
 if(dx<2.1&&dz<2.1&&dx>=-.6&&dz>=-.6)c=Math.max(c,o.cover);}
 return c;
}
const key=(x,z)=>x+','+z;
export function findPath(from,to,r=.5){
 const cell=MAP.cell,nx=MAP.width/cell,nz=MAP.height/cell;
 const coord=p=>({x:clamp(Math.floor((p.x+MAP.width/2)/cell),0,nx-1),z:clamp(Math.floor((p.z+MAP.height/2)/cell),0,nz-1)});
 const center=p=>({x:(p.x+.5)*cell-MAP.width/2,z:(p.z+.5)*cell-MAP.height/2});
 const start=coord(from),goal=coord(to);
 const valid=p=>p.x>=0&&p.x<nx&&p.z>=0&&p.z<nz&&walkable(center(p).x,center(p).z,r);
 if(!valid(start))return [];
 if(!valid(goal)){
  let best=null,score=Infinity;
  for(let dz=-6;dz<=6;dz++)for(let dx=-6;dx<=6;dx++){const p={x:goal.x+dx,z:goal.z+dz};if(valid(p)){const dist=(dx*dx+dz*dz);if(dist<score){score=dist;best=p}}}
  if(!best)return [];goal.x=best.x;goal.z=best.z;
 }
 const list=[{...start,g:0,f:0}],visited=new Set(),distanceMap=new Map([[key(start.x,start.z),0]]),parent=new Map();
 for(let n=0;list.length&&n<2200;n++){
  list.sort((a,b)=>a.f-b.f);const p=list.shift(),k=key(p.x,p.z);if(visited.has(k))continue;visited.add(k);
  if(p.x===goal.x&&p.z===goal.z){
   const out=[];let curr=k;while(curr&&curr!==key(start.x,start.z)){const [x,z]=curr.split(',').map(Number);out.push(center({x,z}));curr=parent.get(curr)}
   return out.reverse();
  }
  for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){
   const t={x:p.x+dx,z:p.z+dz};if(!valid(t)||(dx&&dz&&(!valid({x:p.x+dx,z:p.z})||!valid({x:p.x,z:p.z+dz}))))continue;
   const kk=key(t.x,t.z),g=p.g+(dx&&dz?1.414:1);if(g>= (distanceMap.get(kk)??Infinity))continue;
   distanceMap.set(kk,g);parent.set(kk,k);list.push({...t,g,f:g+Math.hypot(goal.x-t.x,goal.z-t.z)});
  }
 }
 return [];
}
export function giveOrder(m,ids,destination,{append=false,attack=null}={}){
 if(m.phase!=='playing')return 0;
 const selected=live(m).filter(u=>u.team==='friendly'&&ids.includes(u.id)&&u.type!=='convoy');let i=0;
 for(const u of selected){const row=Math.floor(i/4),column=i%4,dx=(column-1.5)*Math.max(1,u.radius*2),dz=row*2;
  const target={x:clamp(destination.x+dx,-33,33),z:clamp(destination.z+dz,-26,26)};
  if(!append){u.path=[];u.order=null}const final=walkable(target.x,target.z,u.radius)?target:destination;
  if(append&&u.order?.target){u.path.push({...final,queued:true});}else {u.order={kind:attack?'attack':'move',target:final,targetId:attack};u.path=findPath(u,final,u.radius);}
  i++;m.orders++;
 }return i;
}
function mitigation(target,attacker){
 const base=specs[target.type].armor;
 const angle=Math.atan2(attacker.x-target.x,attacker.z-target.z),relative=Math.cos(angle-target.yaw);
 const armor=base*(relative>.4?1.5:relative<-.4?.6:1);
 return {armor,angle};
}
export function applyDamage(m,target,rawDamage,attacker){
 if(!target?.alive||m.phase!=='playing')return 0;
 const {armor}=mitigation(target,attacker),cover=target.type==='infantry'||target.type==='medic'||target.type==='engineer'||target.type==='bot'?coverAt(target):0;
 const effective=Math.max(1,Math.round((rawDamage-armor)*(1-cover)));
 target.hp=clamp(target.hp-effective,0,specs[target.type].hp);
 if(target.hp<=0){target.alive=false;target.order=null;target.path=[];if(target.team==='enemy')m.kills++;else m.losses++;}
 if(target.type==='tank'||target.type==='apc'||target.type==='enemyArmor'){
  target.component.weapon=clamp(target.component.weapon-effective*.12,0,100);
  target.component.engine=clamp(target.component.engine-effective*.07,0,100);
 }
 return effective;
}
// Solid buildings block sight; low barricades provide partial damage cover instead.
export function lineClear(a,b){
 for(const o of obstacles.filter(x=>x.type==='building')){
  let lo=0,hi=1;
  for(const [start,end,min,max] of [[a.x,b.x,o.x-o.w/2,o.x+o.w/2],[a.z,b.z,o.z-o.d/2,o.z+o.d/2]]){
   const delta=end-start;if(Math.abs(delta)<1e-8){if(start>=min&&start<=max)continue;lo=2;break}
   let x=(min-start)/delta,y=(max-start)/delta;if(x>y)[x,y]=[y,x];lo=Math.max(lo,x);hi=Math.min(hi,y);
  }
  if(lo<=hi&&hi>.08&&lo<.92)return false;
 }
 return true;
}
function acquire(m,u){
 const foes=live(m).filter(v=>v.team!==u.team);
 let best=null,bestDist=Infinity;
 for(const v of foes){const d=distance(u,v);if(d<specs[u.type].range&&d<bestDist&&lineClear(u,v)){best=v;bestDist=d}}return best;
}
function moveUnit(u,target,dt){
 if(!target)return;
 if(u.path.length===0&&distance(u,target)>1.1){u.path=findPath(u,target,u.radius);u.pathAge=0}
 const p=u.path[0];if(!p)return;
 const dx=p.x-u.x,dz=p.z-u.z,d=Math.hypot(dx,dz);
 if(d<Math.max(.35,u.radius*.55)){u.path.shift();if(!u.path.length&&u.order?.kind==='move')u.order=null;return}
 const factor=clamp(u.component.engine/100,.25,1);
 const step=Math.min(d,specs[u.type].speed*factor*dt),nx=u.x+dx/d*step,nz=u.z+dz/d*step;
 if(walkable(nx,nz,u.radius)){u.x=nx;u.z=nz;u.yaw=Math.atan2(dx,dz)}
 else{u.path=[];u.pathAge=0}
}
export function tick(m,dt){
 if(m.phase!=='playing')return m;
 dt=clamp(Number(dt)||0,0,.05);m.time+=dt;
 const convoy=m.units.find(u=>u.id==='convoy');
 if(!convoy.alive){m.phase='lost';m.result='Convoi détruit.';m.message=m.result;return m}
 if(m.escortEnabled&&m.routeIndex<m.convoyRoute.length){
  const t=m.convoyRoute[m.routeIndex];
  const escort=live(m).some(u=>u.team==='friendly'&&u.type!=='convoy'&&distance(u,convoy)<10);
  const enemyNear=live(m).some(u=>u.team==='enemy'&&distance(u,convoy)<12);
  if(escort&&!enemyNear){convoy.order={kind:'move',target:t};if(!convoy.path.length)convoy.path=findPath(convoy,t,convoy.radius);}
  else {convoy.order=null;convoy.path=[]}
  if(distance(convoy,t)<2.2)m.routeIndex++;
 }
 for(const u of live(m)){
  u.cooldown=Math.max(0,u.cooldown-dt);u.pathAge+=dt;
  if(u.reload>0){u.reload=Math.max(0,u.reload-dt);if(!u.reload){const s=specs[u.type],count=Math.min(s.mag,u.reserve);u.ammo=count;u.reserve-=count}}
  if(!u.ammo&&u.reserve>0&&u.reload===0)u.reload=u.type==='tank'?3:1.9;
  if(u.team==='enemy'){
   let target=acquire(m,u);
   if(target){if(distance(u,target)>specs[u.type].range*.78)u.order={kind:'attack',target:{x:target.x,z:target.z},targetId:target.id};
   else {u.order=null;u.path=[]}}
   else if(!u.order&&u.type!=='enemyArmor')u.order={kind:'move',target:{x:clamp(u.x+Math.sin(m.time/12+u.id.length)*6,-30,30),z:clamp(u.z+Math.cos(m.time/13+u.id.length)*6,-24,24)}};
  }
  const canMove=u.order&&u.type!=='convoy'||u.type==='convoy'&&u.order;
  if(canMove){let t=u.order.target;if(u.order.targetId){const target=m.units.find(v=>v.id===u.order.targetId&&v.alive);if(target)t={x:target.x,z:target.z}}
   if(u.pathAge>1.6&&u.type!=='convoy'){u.path=findPath(u,t,u.radius);u.pathAge=0}
   moveUnit(u,t,dt)}
  if(u.team==='friendly'&&u.type==='supply'){
   for(const ally of live(m).filter(v=>v.team==='friendly'&&v.id!==u.id&&distance(u,v)<4.5)){
    const spec=specs[ally.type];ally.service+=dt;
    if(ally.service>=2.5){ally.service=0;ally.reserve=Math.min(spec.reserve,ally.reserve+Math.max(8,Math.round(spec.mag*.5)));ally.hp=Math.min(spec.hp,ally.hp+7);ally.component.engine=Math.min(100,ally.component.engine+5);}
   }
  }
  const target=acquire(m,u),s=specs[u.type];
  if(target&&s.damage>0&&u.cooldown===0&&u.reload===0&&u.ammo>0&&u.component.weapon>10){
   u.ammo--;u.cooldown=s.rate;
   m.shots.push({x:u.x,z:u.z,toX:target.x,toZ:target.z,target:target.id,attacker:u.id,team:u.team,damage:s.damage,life:distance(u,target)/s.projectileSpeed});
  }
 }
 for(const shot of m.shots){shot.life-=dt;if(shot.life<=0&&!shot.done){
  const target=m.units.find(u=>u.id===shot.target&&u.alive),source=m.units.find(u=>u.id===shot.attacker);
  if(target&&source&&distance(target,{x:shot.toX,z:shot.toZ})<Math.max(2,specs[target.type].radius*2))applyDamage(m,target,shot.damage,source);
  shot.done=true;
 }}
 m.shots=m.shots.filter(s=>!s.done);
 if(m.routeIndex>=m.convoyRoute.length&&distance(convoy,m.extraction)<m.extraction.r){
  m.phase='won';m.result='Convoi évacué : mission accomplie.';m.message=m.result;
 }else if(!live(m).some(u=>u.team==='friendly'&&u.type!=='convoy')){
  m.phase='lost';m.result='Toutes les unités d’escorte sont perdues.';m.message=m.result;
 }
 return m;
}
export function serialize(m){return JSON.stringify({version:1,phase:m.phase,time:m.time,units:m.units,shots:[],kills:m.kills,losses:m.losses,orders:m.orders,objective:m.objective,message:m.message,convoyRoute:m.convoyRoute,routeIndex:m.routeIndex,escortEnabled:m.escortEnabled,extraction:m.extraction,result:m.result})}
export function restore(raw){
 const saved=JSON.parse(raw);if(saved?.version!==1||!Array.isArray(saved.units)||saved.units.length>100||!['playing','won','lost'].includes(saved.phase))throw Error('Sauvegarde incompatible.');
 for(const u of saved.units){if(!specs[u.type]||!['friendly','enemy'].includes(u.team)||typeof u.id!=='string'||!Number.isFinite(u.x)||!Number.isFinite(u.z))throw Error('Unité corrompue.');u.selected=false;u.path=[];u.order=null;u.pathAge=0}
 if(!saved.units.some(u=>u.id==='convoy'))throw Error('Convoi manquant.');
 saved.shots=[];return saved;
}
