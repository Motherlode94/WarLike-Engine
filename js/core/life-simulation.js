import {moveBody2d,solidCollider2d,colliderRect2d} from './physics-2d.js';
import {findEnginePath} from './native-3d.js';
import {faceMovement2d} from './character-facing.js';

const clamp=(v,a=0,b=100)=>Math.max(a,Math.min(b,Number.isFinite(Number(v))?Number(v):a));
const point=o=>({x:o.x+o.w/2,y:o.y+o.h/2});
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export const lifeActor=entities=>entities.find(o=>o.lifeSim?.enabled===true)||null;
export const lifeNeeds={food:'Satiété',energy:'Énergie',hygiene:'Hygiène',social:'Lien social',fun:'Plaisir'};
export const lifeTopics={art:'Création',music:'Musique',nature:'Nature',food:'Cuisine'};
export const lifeActions={
 listen:{label:'Prendre des nouvelles',seconds:2.4},
 chat:{label:'Parler de ses passions',seconds:3},
 joke:{label:'Faire une blague',seconds:2.5},
 compliment:{label:'Faire un compliment',seconds:2.5},
 flirt:{label:'Exprimer son attirance',seconds:3},
 gift:{label:'Offrir une attention · 12 ¤',seconds:2.5},
 invite:{label:'Proposer un moment ensemble',seconds:4},
 apologize:{label:'Présenter ses excuses',seconds:2.5},
};
export const lifeActivities={
 eat:{label:'Prendre un repas',place:'cafe',seconds:4,cost:8,gain:{food:38,fun:5}},
 snack:{label:'Cuisiner à la maison',place:'home',seconds:5,cost:4,gain:{food:30,energy:-2}},
 rest:{label:'Se reposer',place:'home',seconds:12,cost:0,gain:{energy:48,fun:5}},
 shower:{label:'Prendre une douche',place:'home',seconds:4,cost:0,gain:{hygiene:50}},
 work:{label:'Travailler à l’atelier',place:'work',seconds:12,cost:0,gain:{energy:-12,food:-8,fun:-5}},
 relax:{label:'Profiter du jardin',place:'garden',seconds:6,cost:0,gain:{fun:24,energy:5}},
 pantry:{label:'Prendre le panier solidaire',place:'garden',seconds:4,cost:0,gain:{food:24,social:5}},
};
export function defaultLifeState(){return {version:1,minutes:9*60,day:1,money:80,needs:{food:68,energy:78,hygiene:82,social:48,fun:62},relationships:{},task:null,speed:1,paused:false,journal:[],met:[],earned:0,workDay:1,shifts:0,skills:{craft:0},completed:[],notice:'Bienvenue aux Tilleuls. Rencontre tes voisins et trouve ton rythme.',speech:null};}
export function ensureLifeState(actor){
 if(!actor?.lifeSim)return null;
 if(actor.lifeState?.version!==1)actor.lifeState=defaultLifeState();
 const s=actor.lifeState;
 s.money=clamp(s.money,0,99999);s.minutes=clamp(s.minutes,0,1440);s.day=Math.max(1,Math.floor(clamp(s.day,1,99999)));
 s.needs??={};for(const key of Object.keys(lifeNeeds))s.needs[key]=clamp(s.needs[key]??60);
 if(!s.relationships||typeof s.relationships!=='object'||Array.isArray(s.relationships))s.relationships={};
 s.speed=[1,2,4].includes(s.speed)?s.speed:1;s.skills??={craft:0};s.skills.craft=Math.floor(clamp(s.skills.craft,0,9999));
 for(const key of ['earned','shifts','workDay'])s[key]=clamp(s[key],0,99999);
 if(!Array.isArray(s.met))s.met=[];if(!Array.isArray(s.journal))s.journal=[];if(!Array.isArray(s.completed))s.completed=[];
 if(s.task&&(!['walk','social','activity'].includes(s.task.kind)||s.task.kind==='social'&&!Object.hasOwn(lifeActions,s.task.action)||s.task.kind==='activity'&&!Object.hasOwn(lifeActivities,s.task.key)||!['walking','acting'].includes(s.task.phase)))s.task=null;
 return s;
}
export function relationship(actor,npc){
 const s=ensureLifeState(actor),key=String(npc?.id);if(!s||!npc?.lifeNpc)return null;
 if(!Object.hasOwn(s.relationships,key))s.relationships[key]={friendship:0,trust:0,affection:0,dating:false,lastAction:'',lastAt:-99999,visits:0};
 if(!s.relationships[key]||typeof s.relationships[key]!=='object')s.relationships[key]={friendship:0,trust:0,affection:0,lastAt:-99999,visits:0};
 const r=s.relationships[key];for(const k of ['friendship','affection'])r[k]=clamp(r[k]);r.trust=clamp(r.trust,-100,100);r.visits=clamp(r.visits,0,99999);return r;
}
export function lifeRelationshipLabel(r){return r?.dating?'En couple':r?.trust< -10?'Relation tendue':r?.friendship>=60?'Amitié forte':r?.friendship>=30?'Amis':r?.friendship>0?'Connaissances':'À rencontrer';}
export const lifeMood=s=>{const mean=Object.values(s.needs).reduce((a,b)=>a+b,0)/5;return mean>=72?'Épanoui':mean>=48?'Bien dans sa journée':mean>=28?'Besoin de souffler':'À bout de forces';};
export const lifeTime=s=>String(Math.floor(s.minutes/60)).padStart(2,'0')+':'+String(Math.floor(s.minutes%60)).padStart(2,'0');
const stamp=s=>(s.day-1)*1440+s.minutes;
const report=(s,text)=>{s.notice=text;s.journal.unshift({day:s.day,time:lifeTime(s),text});s.journal.length=Math.min(s.journal.length,16);};
export function lifeNpcAvailable(npc,s){return !!npc?.lifeNpc&&s.minutes>=7*60&&s.minutes<22*60;}
export function lifeNpcPlace(npc,s){return !lifeNpcAvailable(npc,s)?'Chez soi':s.minutes<12*60?'Au café':s.minutes<18*60?'Dans le quartier':'Au jardin';}
export function cancelLifeTask(actor,{quiet=false}={}){const s=ensureLifeState(actor);if(!s)return;delete actor._lifePath;s.task=null;actor.animation='idle';if(!quiet)s.notice='Action annulée. Tu peux choisir une autre activité.';}
function queueTask(actor,task){const s=ensureLifeState(actor);if(!s)return false;if(s.task){s.notice='Termine ou annule l’action en cours.';return false}s.task={...task,phase:'walking',remaining:0,blocked:0};delete actor._lifePath;return true;}
export function walkLifeTo(actor,target){
 if(!target||![target.x,target.y].every(Number.isFinite)||!actor?.lifeSim)return false;
 const bounds=actor.lifeSim.bounds||{w:1280,h:960};cancelLifeTask(actor,{quiet:true});
 return queueTask(actor,{kind:'walk',x:clamp(target.x,32,bounds.w-32),y:clamp(target.y,32,bounds.h-32)});
}
export function requestLifeActivity(actor,entities,key){
 const s=ensureLifeState(actor),cfg=lifeActivities[key];if(!s||!Object.hasOwn(lifeActivities,key))return false;
 const place=entities.find(o=>o.lifePlace?.kind===cfg.place);if(!place)return false;
 if(s.money<cfg.cost){s.notice='Il te manque '+(cfg.cost-s.money)+' ¤.';return false}
 if(key==='pantry'&&s.mealDay===s.day){s.notice='Le panier solidaire est disponible une fois par jour.';return false}
 if(key==='work'){
  if(s.minutes<8*60||s.minutes>=18*60){s.notice='L’atelier est ouvert de 08:00 à 18:00.';return false}
  if(s.needs.energy<20||s.needs.food<15){s.notice='Mange et repose-toi avant de travailler.';return false}
  if(s.workDay===s.day&&s.shifts>=3){s.notice='Trois missions aujourd’hui : reviens demain.';return false}
 }
 if(cfg.place==='cafe'&&(s.minutes<7*60||s.minutes>=22*60)){s.notice='Le café est ouvert de 07:00 à 22:00.';return false}
 return queueTask(actor,{kind:'activity',key,targetId:place.id});
}
export function requestLifeSocial(actor,entities,npcId,action,{topic='art'}={}){
 const s=ensureLifeState(actor),npc=entities.find(o=>o.id===npcId&&o.lifeNpc);
 if(!s||!npc||!Object.hasOwn(lifeActions,action))return false;
 if(!lifeNpcAvailable(npc,s)){s.notice=npc.name+' se repose. Reviens entre 07:00 et 22:00.';return false}
 if(action==='gift'&&s.money<12){s.notice='Une attention coûte 12 ¤.';return false}
 return queueTask(actor,{kind:'social',targetId:npcId,action,topic:Object.hasOwn(lifeTopics,topic)?topic:'art'});
}
function finishSocial(actor,npc,task){
 const s=ensureLifeState(actor),r=relationship(actor,npc),cfg=npc.lifeNpc,now=stamp(s);
 if(!lifeNpcAvailable(npc,s)){report(s,npc.name+' doit rentrer. Vous reprendrez cette discussion demain.');return}
 if(task.action==='gift'&&s.money<12){report(s,'Tu n’as plus assez d’argent pour ce cadeau.');return}
 const repeat=r.lastAction===task.action&&now-r.lastAt<90;let friendship=0,trust=0,affection=0,text='';
 if(repeat){friendship=-2;trust=-1;text='On en a déjà parlé. Changeons un peu de sujet.';}
 else if(task.action==='listen'){friendship=6;trust=7;text=cfg.news;}
 else if(task.action==='chat'){const match=task.topic===cfg.likes;friendship=match?11:4;trust=match?4:1;text=match?cfg.favorite:'Ce n’est pas mon sujet préféré, mais ça me fait plaisir de discuter.';}
 else if(task.action==='joke'){const tired=s.minutes>=21*60;friendship=tired?0:6;trust=tired?-1:1;text=tired?'Je manque un peu d’énergie pour les blagues.':'Tu m’as fait rire, ça fait du bien !';}
 else if(task.action==='compliment'){friendship=4;trust=2;affection=r.friendship>=20?3:0;text='Merci d’avoir remarqué, ça me touche.';}
 else if(task.action==='gift'){s.money-=12;friendship=8;trust=3;affection=r.friendship>=25?4:0;text='Une petite attention ? Merci, c’est adorable.';}
 else if(task.action==='flirt'){
  if(!cfg.romance){text='Je préfère que l’on reste amis. Merci de respecter ça.';}
  else if(r.friendship<30||r.trust<15){trust=-3;text='J’aimerais apprendre à te connaître avant d’aller plus loin.';}
  else {friendship=4;affection=12;trust=2;text=r.affection>=20?'Je ressens la même chose. On essaie de se voir, tous les deux ?':'J’aime bien les moments qu’on passe ensemble. Prenons notre temps.';if(r.affection>=20){r.dating=true;text='Oui, j’ai envie qu’on essaie une relation ensemble.';}}
 }
 else if(task.action==='invite'){if(r.friendship<20){text='Une prochaine fois, quand on se connaîtra un peu mieux.';}else{friendship=9;trust=5;affection=r.dating?6:0;s.needs.fun=clamp(s.needs.fun+18);text='Avec plaisir. Ce petit moment ensemble m’a fait du bien.';}}
 else if(task.action==='apologize'){trust=r.trust<10?6:1;friendship=2;text='Merci d’en parler avec moi. On repart sur de meilleures bases.';}
 r.friendship=clamp(r.friendship+friendship);r.trust=clamp(r.trust+trust,-100,100);r.affection=clamp(r.affection+affection);r.lastAction=task.action;r.lastAt=now;r.visits++;
 if(!s.met.includes(npc.id))s.met.push(npc.id);s.needs.social=clamp(s.needs.social+14);s.needs.fun=clamp(s.needs.fun+3);
 s.speech={npcId:npc.id,text,until:now+35};
 report(s,npc.name+' : « '+text+' »'+(friendship?' · lien '+(friendship>0?'+':'')+friendship:''));
}
function finishActivity(actor,entities,task){
 const s=ensureLifeState(actor),cfg=lifeActivities[task.key];
 if(!cfg||s.money<cfg.cost){report(s,'Ressources insuffisantes : l’activité n’a pas été facturée.');return}
 if(task.key==='pantry'){if(s.mealDay===s.day){report(s,'Tu as déjà pris ton panier aujourd’hui.');return}s.mealDay=s.day;}
 if(task.key==='work'){
  if(s.workDay!==s.day){s.workDay=s.day;s.shifts=0}
  if(s.shifts>=3){report(s,'La journée de travail est déjà terminée.');return}
  const pay=35+Math.min(20,Math.floor(s.skills.craft/3)*5);s.money+=pay;s.earned+=pay;s.shifts++;s.skills.craft++;
  report(s,'Mission terminée · +'+pay+' ¤ · savoir-faire '+s.skills.craft+'.');
 }else report(s,cfg.label+' · '+(cfg.cost?'−'+cfg.cost+' ¤.':'tu as pris soin de toi.'));
 s.money=clamp(s.money-cfg.cost,0,99999);for(const [key,value] of Object.entries(cfg.gain))s.needs[key]=clamp(s.needs[key]+value);
}
function stepToward(actor,to,entities,dt,speed=150){
 const from=point(actor);if(distance(from,to)<10){actor.animation='idle';return true}
 const obstacles=entities.filter(o=>o!==actor&&!o.lifeNpc&&solidCollider2d(o)).map(colliderRect2d);
 if(!actor._lifePath||distance(actor._lifePath.goal,to)>30||actor._lifePath.age>1.2){
  actor._lifePath={goal:{...to},age:0,points:obstacles.length?findEnginePath(from,to,obstacles,{cellSize:24,padding:22,maxNodes:2400}):[{...to}]};
 }
 const path=actor._lifePath;path.age+=dt;while(path.points.length&&distance(from,path.points[0])<9)path.points.shift();
 const target=path.points[0];if(!target)return false;
 const dx=target.x-from.x,dy=target.y-from.y,length=Math.hypot(dx,dy)||1,step=Math.min(length,speed*dt),x=actor.x,y=actor.y;
 moveBody2d(actor,dx/length*step,dy/length*step,entities.filter(o=>!o.lifeNpc));faceMovement2d(actor,actor.x-x,actor.y-y);actor.animation='walk';return false;
}
function updateGoals(s){
 const candidates=[['meet',s.met.length>=2],['work',s.earned>=70],['friend',Object.values(s.relationships).some(r=>r.friendship>=30)],['balance',Object.values(s.needs).every(v=>v>=55)]];
 for(const [id,complete] of candidates)if(complete&&!s.completed.includes(id)){s.completed.push(id);report(s,'Petit bonheur accompli : '+({meet:'faire deux rencontres',work:'gagner 70 ¤',friend:'créer une amitié',balance:'retrouver son équilibre'})[id]+'.');}
}
export function tickLifeSimulation(entities,actor,dt,{keys=new Set(),inputBlocked=false}={}){
 const s=ensureLifeState(actor);if(!s||s.paused||!Number.isFinite(dt)||dt<=0)return;
 const frame=Math.min(.1,dt)*s.speed,minutes=frame*2,oldDay=s.day;
 s.minutes+=minutes;while(s.minutes>=1440){s.minutes-=1440;s.day++}
 if(s.day!==oldDay){s.shifts=0;s.workDay=s.day;for(const r of Object.values(s.relationships))r.friendship=clamp(r.friendship-1);report(s,'Une nouvelle journée commence aux Tilleuls.');}
 for(const [key,rate] of Object.entries({food:.035,energy:.045,hygiene:.025,social:.05,fun:.03}))s.needs[key]=clamp(s.needs[key]-rate*minutes);
 if(inputBlocked)return;
 const x=Number(keys.has('arrowright')||keys.has('d'))-Number(keys.has('arrowleft')||keys.has('a')||keys.has('q'));
 const y=Number(keys.has('arrowdown')||keys.has('s'))-Number(keys.has('arrowup')||keys.has('w')||keys.has('z'));
 if(x||y){cancelLifeTask(actor,{quiet:true});const length=Math.hypot(x,y),speed=(s.needs.energy<15?95:175)*(keys.has('shift')?1.35:1),before={x:actor.x,y:actor.y};moveBody2d(actor,x/length*speed*frame,y/length*speed*frame,entities);faceMovement2d(actor,actor.x-before.x,actor.y-before.y);actor.animation='walk';}
 const bounds=actor.lifeSim.bounds||{w:1280,h:960};actor.x=clamp(actor.x,24,bounds.w-actor.w-24);actor.y=clamp(actor.y,24,bounds.h-actor.h-24);
 const task=s.task;
 if(task){const advanceTask=()=>{
  const target=task.kind==='walk'?task:entities.find(o=>o.id===task.targetId),to=task.kind==='walk'?{x:task.x,y:task.y}:target?.lifePlace?.entry||target&&point(target);
  if(!to||task.kind==='social'&&!target?.lifeNpc||task.kind==='activity'&&!target?.lifePlace){cancelLifeTask(actor);s.notice='Cette destination n’existe plus.';return}
  const radius=task.kind==='walk'?12:task.kind==='social'?75:28;
  if(task.phase==='walking'){
   if(distance(point(actor),to)>radius){const before=point(actor);stepToward(actor,to,entities,frame);task.blocked=distance(before,point(actor))<.1?task.blocked+frame:0;if(task.blocked>4){cancelLifeTask(actor);s.notice='Le passage est bloqué. Choisis un point dégagé.';}return}
   if(task.kind==='walk'){cancelLifeTask(actor,{quiet:true});return}
   task.phase='acting';task.remaining=task.kind==='social'?lifeActions[task.action].seconds:lifeActivities[task.key].seconds;task.total=task.remaining;actor.animation='idle';delete actor._lifePath;
  }
  if(task.phase==='acting'){
   if(distance(point(actor),to)>radius+35){cancelLifeTask(actor);return}
   task.remaining=Math.max(0,task.remaining-frame);
   if(task.remaining===0){s.task=null;if(task.kind==='social')finishSocial(actor,target,task);else finishActivity(actor,entities,task);updateGoals(s);}
  }
 };advanceTask();}else if(!x&&!y)actor.animation='idle';
 for(const npc of entities.filter(o=>o.lifeNpc)){
  if(s.task?.targetId===npc.id)continue;
  const cfg=npc.lifeNpc,route=!lifeNpcAvailable(npc,s)?cfg.home:s.minutes<12*60?cfg.morning:s.minutes<18*60?cfg.afternoon:cfg.evening;
  if(route)stepToward(npc,route,entities,frame,42);
 }
 if(s.speech&&stamp(s)>s.speech.until)s.speech=null;
}
