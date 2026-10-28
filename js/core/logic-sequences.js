import {vehicleComponents,repairVehicle,refuelVehicle,setVehicleEngine,canDriveVehicle,setVehicleGear} from './vehicle-components.js';
import {fireVehicleWeapon} from './vehicle-weapons-3d.js';
import {recordEngineEvent} from './engine-diagnostics.js';
import {coerceVariable} from './blueprint-graph.js';
import {horror,triggerHorrorJumpscare} from './horror-survival.js';
import {inventoryAdd,inventoryRemove,inventoryCount,equipItem,damage,setHealth,ensureAi} from './gameplay-components.js';
import {healthOf,sameFaction,isHostileTo} from './ai-perception.js';
// WarLike Sequences — no-code event, branch, instruction and signal runtime.
// Independent of the legacy 2D Visual Logic component; works in either workspace.
export const sequenceEvents=['start','interact','enter','exit','keyDown','interval','signal'];
export const sequenceConditions=['always','variable','localVariable','distanceLess','distanceGreater','objectEnabled','healthBelow','healthAbove','hasTag','playerInVehicle','playerOnFoot','randomChance','inventoryHas','inventoryMissing','tagMissing','speedAbove','speedBelow','distanceToPointLess','distanceToPointGreater','horrorThreatAbove','horrorFearAbove','gameTimeAbove','objectType','entityExists','aiStateIs','aiAwarenessAbove','aiCanSeeTarget','aiHasTarget','sameFaction','isHostile','weaponAmmoAbove','weaponReady','vehicleDriveable','vehicleFuelBelow','vehicleHealthBelow','vehicleHasDriver'];
export const sequenceInstructions=['message','setVariable','addVariable','setLocal','addLocal','wait','moveObject','teleportObject','setColor','enableObject','setHealth','addHealth','setAnimation','setBehavior','emitSignal','destroyObject','giveItem','removeItem','equipItem','damageObject','healObject','setTag','removeTag','setSpeed','addSpeed','setPosition','setRotation','setScale','setVisibility','setCollision','setObjective','completeObjective','setCheckpoint','setTeam','setScore','addScore','setFuel','addFuel','setHunger','addHunger','setThirst','addThirst','setStamina','addStamina','setFear','setThreat','setLight','setAudio','setVehicleState','setAiState','setAiFaction','setAiTarget','setAiDetection','setAiAttackRange','setAiPatrolPoint','setWeaponAmmo','addWeaponAmmo','reloadWeapon','setWeaponDamage','fireVehicleWeapon','repairVehicle','refuelVehicle','setVehicleEngine','setVehicleGear','setVehicleWeapon','clearAiTarget','setAiEnabled','setAiLineOfSight','setAiFieldOfView','setAiMemory','setAiSearchDuration'];
export const newSequence=()=>({enabled:true,event:'interact',key:'e',radius:96,interval:2,signal:'',once:false,conditions:[],instructions:[{type:'message',value:'Bienvenue !'}]});
export const sequenceRuntime={globals:{},messages:[],time:0,pressed:new Set(),inside:new Set(),fired:new Set(),cooldowns:new Map(),jobs:[],signals:[]};
const number=(n,def=0)=>Number.isFinite(Number(n))?Number(n):def;
const MAX_ACTIONS=256,MAX_SIGNALS=64,MAX_JOBS=100;
const distance=(a,b)=>Math.hypot((number(a.x)+number(a.w)/2)-(number(b.x)+number(b.w)/2),(number(a.y)+number(a.h)/2)-(number(b.y)+number(b.h)/2));
const safeSteps=steps=>Array.isArray(steps)?steps.slice(0,MAX_ACTIONS):[];
const safeConditions=conditions=>Array.isArray(conditions)?conditions.slice(0,MAX_ACTIONS):[];
export function resetSequences(){sequenceRuntime.globals={};sequenceRuntime.messages=[];sequenceRuntime.time=0;sequenceRuntime.pressed.clear();sequenceRuntime.inside.clear();sequenceRuntime.fired.clear();sequenceRuntime.cooldowns.clear();sequenceRuntime.jobs=[];sequenceRuntime.signals=[]}
export const emitSequenceSignal=name=>{if(sequenceRuntime.signals.length<MAX_SIGNALS)sequenceRuntime.signals.push(String(name||'').slice(0,60))};
export function resolveSequenceTarget(step,owner,ctx){
 if(step.targetRole==='player')return ctx.player||null;
 if(step.targetId!=null&&step.targetId!==''&&number(step.targetId)>0)return (ctx.entities||[]).find(entity=>entity.id===number(step.targetId))||null;
 return owner;
}
export function conditionPass(c,o,ctx){
 const target=resolveSequenceTarget(c,o,ctx);
 const inventoryTarget=c.targetRole||c.targetId?target:ctx.player;
 const compare=(a,b,op)=>op==='>'?number(a)>number(b):op==='<'?number(a)<number(b):op==='>='?number(a)>=number(b):op==='<='?number(a)<=number(b):op==='!='?String(a)!==String(b):String(a)===String(b);
 let pass=false;
 switch(c.type){
 case 'always':pass=true;break;
 case 'variable':pass=compare(sequenceRuntime.globals[c.key],c.value,c.operator||'==');break;
 case 'localVariable':pass=compare(o.sequenceLocal?.[c.key],c.value,c.operator||'==');break;
 case 'distanceLess':pass=!!ctx.player&&distance(o,ctx.player)<Math.max(0,number(c.value,96));break;
 case 'distanceGreater':pass=!!ctx.player&&distance(o,ctx.player)>Math.max(0,number(c.value,96));break;
 case 'healthBelow':pass=!!target&&healthOf(target)<number(c.value,50);break;
 case 'healthAbove':pass=!!target&&healthOf(target)>number(c.value,50);break;
 case 'hasTag':pass=Array.isArray(o.tags)&&o.tags.includes(String(c.value??''));break;
 case 'playerInVehicle':pass=!!ctx.player?._hiddenInVehicle;break;
 case 'playerOnFoot':pass=!!ctx.player&&!ctx.player._hiddenInVehicle;break;
 case 'randomChance':pass=Math.random()<Math.max(0,Math.min(1,number(c.value,.5)));break;
 case 'objectEnabled':pass=o.sequenceEnabled!==false;break;
 case 'inventoryHas':pass=inventoryCount(inventoryTarget,c.key)>=Math.max(1,number(c.value,1));break;
 case 'inventoryMissing':pass=inventoryCount(inventoryTarget,c.key)<Math.max(1,number(c.value,1));break;
 case 'tagMissing':pass=!Array.isArray(o.tags)||!o.tags.includes(String(c.value??''));break;
 case 'speedAbove':pass=number(o.aiSpeed??o.maxSpeed)>number(c.value);break;
 case 'speedBelow':pass=number(o.aiSpeed??o.maxSpeed)<number(c.value);break;
 case 'distanceToPointLess':pass=Math.hypot(number(o.x)-number(c.x),number(o.y)-number(c.y))<number(c.value,100);break;
 case 'distanceToPointGreater':pass=Math.hypot(number(o.x)-number(c.x),number(o.y)-number(c.y))>number(c.value,100);break;
 case 'horrorThreatAbove':pass=number(horror.threat)>number(c.value,.5);break;
 case 'horrorFearAbove':pass=number(horror.fear)>number(c.value,50);break;
 case 'gameTimeAbove':pass=number(sequenceRuntime.time)>number(c.value,10);break;
 case 'objectType':pass=String(o.type)===String(c.value);break;
 case 'aiStateIs':pass=!!target&&String(target.ai?.state||target.horrorAI?.state||target.behavior||'idle')===String(c.value);break;
 case 'aiCanSeeTarget':pass=target?.ai?.visible===true;break;
 case 'aiHasTarget':pass=target?.ai?.targetId!=null;break;
 case 'aiAwarenessAbove':pass=number(target?.horrorAI?.awareness??target?.ai?.awareness)>number(c.value,.5);break;
 case 'sameFaction':pass=sameFaction(target,ctx.player);break;
 case 'isHostile':pass=isHostileTo(target,ctx.player,ctx.player);break;
 case 'weaponAmmoAbove':pass=number(o.weaponSystem?.ammo)>number(c.value,0);break;
 case 'weaponReady':pass=number(o.weaponSystem?.ammo)>0&&number(o.weaponSystem?.cooldown)<=0;break;
 case 'vehicleDriveable':pass=!!o.vehicleSystems&&canDriveVehicle(o);break;
 case 'vehicleFuelBelow':pass=number(o.vehicleSystems?.fuel?.amount,100)<number(c.value,25);break;
 case 'vehicleHealthBelow':pass=number(o.vehicleSystems?.engine?.health,100)<number(c.value,50);break;
 case 'vehicleHasDriver':pass=o.vehicleSystems?.seats?.driverId!=null;break;
 case 'entityExists':pass=(ctx.entities||[]).some(entity=>entity.id===number(c.value)||entity.name===String(c.value));break;
 default:pass=false;
 }
 return c.negate?!pass:pass;
}
export function chooseSequenceBranch(sequence,obj,ctx){
 if(!Array.isArray(sequence.branches)||!sequence.branches.length)return safeSteps(sequence.instructions);
 for(const branch of sequence.branches.slice(0,MAX_ACTIONS)){if(!branch||typeof branch!=='object')continue;if(safeConditions(branch.conditions).every(c=>c&&conditionPass(c,obj,ctx)))return safeSteps(branch.instructions)}
 return safeSteps(sequence.elseInstructions);
}
function execute(job,ctx,actionsLeft){
 const rt=sequenceRuntime,entity=ctx.entities.find(o=>o.id===job.objectId);
 if(!entity||entity.sequence?.enabled===false||entity.sequenceEnabled===false||entity._sequenceDestroyed){job.index=job.steps.length;return 0}
 let count=0;
 while(job.index<job.steps.length&&count<actionsLeft){
  const a=job.steps[job.index++];count++;if(!a||a.disabled||typeof a.type!=='string')continue;
  recordEngineEvent('blueprint',String(a.type)+' · '+String(entity.name||entity.id));
  const key=String(a.key||'score').slice(0,60),val=a.value;
  const targetObject=resolveSequenceTarget(a,entity,ctx);
  if(!targetObject)continue;
  switch(a.type){
  case 'message':rt.messages.push({text:String(val||'Action exécutée').slice(0,160),ttl:3});break;
  case 'setVariable':rt.globals[key]=val??0;break;
  case 'addVariable':rt.globals[key]=number(rt.globals[key])+number(val);break;
  case 'setLocal':entity.sequenceLocal??={};entity.sequenceLocal[key]=val??0;break;
  case 'addLocal':entity.sequenceLocal??={};entity.sequenceLocal[key]=number(entity.sequenceLocal[key])+number(val);break;
  case 'moveObject':{const target=targetObject;target.x+=number(a.x);target.y+=number(a.y);break}
  case 'teleportObject':{const target=targetObject;target.x=number(a.x,target.x);target.y=number(a.y,target.y);break}
  case 'giveItem':{const target=targetObject;inventoryAdd(target,key,Math.max(1,number(val,1)));break}
  case 'removeItem':{const target=targetObject;inventoryRemove(target,key,Math.max(1,number(val,1)));break}
  case 'equipItem':{const target=targetObject;equipItem(target,key,a.slot||'weapon');break}
  case 'damageObject':{const target=targetObject;damage(target,number(val,10));break}
  case 'healObject':{const target=targetObject;setHealth(target,healthOf(target)+Math.max(0,number(val,10)));break}
  case 'setHealth':{const target=targetObject;setHealth(target,number(val,100));break}
  case 'addHealth':{const target=targetObject;setHealth(target,healthOf(target)+number(val));break}
  case 'setAnimation':{const target=targetObject;target.animation=String(val||'idle').slice(0,64);break}
  case 'setBehavior':{const target=targetObject;const behavior=String(val||'none');if(['none','patrol','chase','guard','wander','flee','follow'].includes(behavior))target.behavior=behavior;break}
  case 'setColor':if(/^#[a-f0-9]{6}$/i.test(String(val))){entity.color=val;entity.colorCustomized=true}break;
  case 'enableObject':{const target=targetObject;target.sequenceEnabled=val!==false&&String(val)!=='false';break}
  case 'emitSignal':if(horror.enabled&&String(val||key)==='horror:jumpscare')triggerHorrorJumpscare();emitSequenceSignal(val||key);break;
  case 'destroyObject':entity._sequenceDestroyed=true;break;
  case 'setTag':targetObject.tags=Array.from(new Set([...(Array.isArray(targetObject.tags)?targetObject.tags:[]),String(val??key).slice(0,60)]));break;
  case 'removeTag':targetObject.tags=(targetObject.tags||[]).filter(tag=>tag!==String(val??key));break;
  case 'setSpeed':targetObject.aiSpeed=Math.max(0,number(val,65));if(targetObject.ai)targetObject.ai.speed=targetObject.aiSpeed;break;
  case 'addSpeed':targetObject.aiSpeed=Math.max(0,number(targetObject.ai?.speed??targetObject.aiSpeed,65)+number(val));if(targetObject.ai)targetObject.ai.speed=targetObject.aiSpeed;break;
  case 'setPosition':targetObject.x=number(a.x,targetObject.x);targetObject.y=number(a.y,targetObject.y);break;
  case 'setRotation':targetObject.rotation=number(val);break;
  case 'setScale':targetObject.scale=Math.max(.01,number(val,1));break;
  case 'setVisibility':targetObject.visible=val!==false&&String(val)!=='false';break;
  case 'setCollision':targetObject.collision3d=val!==false&&String(val)!=='false';break;
  case 'setObjective':rt.globals['objective:'+key]=0;rt.messages.push({text:String(val||key).slice(0,160),ttl:3});break;
  case 'completeObjective':rt.globals['objective:'+key]=1;emitSequenceSignal('objective:'+key);break;
  case 'setCheckpoint':rt.globals.checkpointX=number(targetObject.x);rt.globals.checkpointY=number(targetObject.y);break;
  case 'setTeam':targetObject.team=Math.max(0,Math.trunc(number(val,1)));break;
  case 'setScore':rt.globals.score=number(val);break;
  case 'addScore':rt.globals.score=number(rt.globals.score)+number(val);break;
  case 'setFuel':targetObject.fuel=Math.max(0,number(val));break;
  case 'addFuel':targetObject.fuel=Math.max(0,number(targetObject.fuel)+number(val));break;
  case 'setHunger':rt.globals.hunger=Math.max(0,Math.min(100,number(val)));break;
  case 'addHunger':rt.globals.hunger=Math.max(0,Math.min(100,number(rt.globals.hunger,100)+number(val)));break;
  case 'setThirst':rt.globals.thirst=Math.max(0,Math.min(100,number(val)));break;
  case 'addThirst':rt.globals.thirst=Math.max(0,Math.min(100,number(rt.globals.thirst,100)+number(val)));break;
  case 'setStamina':rt.globals.stamina=Math.max(0,Math.min(100,number(val)));break;
  case 'addStamina':rt.globals.stamina=Math.max(0,Math.min(100,number(rt.globals.stamina,100)+number(val)));break;
  case 'setFear':horror.fear=Math.max(0,Math.min(100,number(val)));break;
  case 'setThreat':horror.threat=Math.max(0,Math.min(1,number(val)));break;
  case 'setLight':targetObject.lightEnabled=val!==false&&String(val)!=='false';break;
  case 'setAudio':targetObject.audioEnabled=val!==false&&String(val)!=='false';break;
  case 'setVehicleState':targetObject.vehicleState=String(val??'parked').slice(0,60);break;
  case 'setAiState':ensureAi(targetObject).state=String(val||'idle').slice(0,40);break;
  case 'setAiFaction':targetObject.aiFaction=String(val||'neutral').slice(0,40);break;
  case 'setAiTarget':ensureAi(targetObject);targetObject.aiTargetId=number(val)>0?number(val):(ctx.player?.id??null);targetObject.ai.path=null;break;
  case 'clearAiTarget':targetObject.aiTargetId=null;if(targetObject.ai){Object.assign(targetObject.ai,{targetId:null,memoryRemaining:0,searchRemaining:0,path:null})}break;
  case 'setAiDetection':ensureAi(targetObject).detection=Math.max(0,number(val,300));break;
  case 'setAiAttackRange':ensureAi(targetObject).attackRange=Math.max(0,number(val,70));break;
  case 'setAiEnabled':ensureAi(targetObject).enabled=val!==false&&String(val)!=='false'&&String(val)!=='0';break;
  case 'setAiLineOfSight':ensureAi(targetObject).requireLineOfSight=val!==false&&String(val)!=='false'&&String(val)!=='0';break;
  case 'setAiFieldOfView':ensureAi(targetObject).fieldOfView=Math.max(0,Math.min(360,number(val,160)));break;
  case 'setAiMemory':ensureAi(targetObject).memoryDuration=Math.max(0,Math.min(120,number(val,4)));break;
  case 'setAiSearchDuration':ensureAi(targetObject).searchDuration=Math.max(0,Math.min(120,number(val,2)));break;
  case 'setAiPatrolPoint':ensureAi(targetObject);targetObject.ai.path=null;targetObject.ai.homeX=number(a.x,targetObject.x);targetObject.ai.homeY=number(a.y,targetObject.y);targetObject.ai.state='patrol';break;
  case 'setWeaponAmmo':targetObject.weaponSystem??={};targetObject.weaponSystem.ammo=Math.max(0,Math.trunc(number(val)));break;
  case 'addWeaponAmmo':targetObject.weaponSystem??={};targetObject.weaponSystem.ammo=Math.max(0,Math.trunc(number(targetObject.weaponSystem.ammo)+number(val)));break;
  case 'reloadWeapon':targetObject.weaponSystem??={};targetObject.weaponSystem.ammo=Math.max(0,Math.trunc(number(targetObject.weaponSystem.magazineSize,30)));break;
  case 'setWeaponDamage':targetObject.weaponSystem??={};targetObject.weaponSystem.damage=Math.max(0,number(val,20));break;
  case 'fireVehicleWeapon':{const shot=fireVehicleWeapon(targetObject,ctx.entities);if(shot.fired)emitSequenceSignal(shot.hit?'weapon:hit':'weapon:fired');break}
  case 'repairVehicle':repairVehicle(targetObject,Math.max(0,number(val,25)));break;
  case 'refuelVehicle':refuelVehicle(targetObject,Math.max(0,number(val,25)));break;
  case 'setVehicleEngine':setVehicleEngine(targetObject,val!==false&&String(val)!=='false'&&String(val)!=='0');break;
  case 'setVehicleGear':setVehicleGear(targetObject,number(val,1));break;
  case 'setVehicleWeapon':targetObject.vehicleWeapon??={};targetObject.vehicleWeapon.enabled=val!==false&&String(val)!=='false'&&String(val)!=='0';break;
  case 'wait':job.wait=Math.min(120,Math.max(0,number(val,.5)));return count;
  }
 }
 return count;
}
export function updateSequences(dt,ctx){
 if(!ctx?.playing)return;
 const rt=sequenceRuntime;dt=Math.min(.1,Math.max(0,number(dt)));rt.time+=dt;
 // Shared race clock for racing Blueprints; advances only while a race is active.
 if(number(rt.globals.raceStarted)===1&&number(rt.globals.raceFinished)!==1)rt.globals.raceElapsed=Math.round((number(rt.globals.raceElapsed)+dt)*1000)/1000;
 const keys=ctx.keys instanceof Set?ctx.keys:new Set(),player=ctx.player||null,objects=Array.isArray(ctx.entities)?ctx.entities:[];
 const signals=rt.signals.splice(0,MAX_SIGNALS);let budget=MAX_ACTIONS;
 // Only jobs suspended before this frame spend dt. Newly started Wait actions
 // must receive their full requested delay, even on the first frame.
 const pendingJobs=rt.jobs.splice(0);
 for(const job of pendingJobs){
  const owner=objects.find(o=>o.id===job.objectId);
  if(!owner||owner.sequence?.enabled===false||owner.sequenceEnabled===false||owner._sequenceDestroyed)continue;
  job.wait=Math.max(0,job.wait-dt);
  if(job.wait<=1e-9&&budget>0)budget-=execute(job,ctx,budget)||0;
  if(job.index<job.steps.length)rt.jobs.push(job);
 }
 const start=(o,s)=>{
  if(rt.jobs.length>=MAX_JOBS||budget<=0)return;
  const id=o.id;if(s.once&&rt.fired.has(id))return;
  if(Array.isArray(s.graph?.variables))for(const v of s.graph.variables.slice(0,128)){if(v&&typeof v.name==='string'&&v.name&&!(v.name in rt.globals))rt.globals[v.name]=coerceVariable(v.type,v.value)}
  const basePassed=safeConditions(s.conditions).every(c=>c&&conditionPass(c,o,ctx));
  if(!basePassed&&!Array.isArray(s.elseInstructions))return;
  rt.fired.add(id);const steps=safeSteps(basePassed?chooseSequenceBranch(s,o,ctx):s.elseInstructions);
  const job={objectId:id,steps,index:0,wait:0};
  budget-=execute(job,ctx,budget)||0;
  if(job.index<job.steps.length)rt.jobs.push(job);
 };
 for(const o of objects){
  if(!o||typeof o!=='object')continue;
  const s=o.sequence;if(!s||typeof s!=='object'||s.enabled===false||o.sequenceEnabled===false||o._sequenceDestroyed)continue;
  const isInside=!!player&&distance(o,player)<=Math.max(0,number(s.radius,96));
  const wasInside=rt.inside.has(o.id);if(isInside)rt.inside.add(o.id);else rt.inside.delete(o.id);
  const k=String(s.key||'e').toLowerCase();const newKey=keys.has(k)&&!rt.pressed.has(k);
  let trigger=false;
  switch(s.event){
  case 'start':trigger=!rt.cooldowns.has('start:'+o.id);rt.cooldowns.set('start:'+o.id,Infinity);break;
  case 'interact':trigger=isInside&&newKey&&!ctx.player?._vehicleInputConsumed;break;
  case 'keyDown':trigger=newKey;break;
  case 'enter':{
   // A gate can become valid while the player remains inside (e.g. mounting
   // a car). Retry until it succeeds; rejected conditions never consume 'once'.
   const conditions=safeConditions(s.conditions);
   const allowed=conditions.every(c=>c&&conditionPass(c,o,ctx));
   const key='inside-ok:'+o.id;
   const already=rt.cooldowns.get(key)===true;
   trigger=isInside&&allowed&&!already&&(!wasInside||conditions.length>0);
   if(!isInside||!allowed)rt.cooldowns.delete(key);
   else if(trigger)rt.cooldowns.set(key,true);
   break;
  }
  case 'exit':trigger=!isInside&&wasInside;break;
  case 'signal':trigger=signals.includes(String(s.signal||''));break;
  case 'interval':{const key='interval:'+o.id,next=rt.cooldowns.get(key)??(rt.time+Math.max(.1,number(s.interval,2)));trigger=rt.time>=next;if(trigger||!rt.cooldowns.has(key))rt.cooldowns.set(key,rt.time+Math.max(.1,number(s.interval,2)));break}
  }
  if(trigger)start(o,s);
 }
 for(const k of Array.from(rt.pressed))if(!keys.has(k))rt.pressed.delete(k);
 for(const k of keys)rt.pressed.add(k);
 rt.jobs=rt.jobs.filter(j=>j.index<j.steps.length);
 rt.messages=rt.messages.filter(m=>(m.ttl-=dt)>0);
 // Remove objects only after action execution, never while iterating triggers.
 for(let i=objects.length-1;i>=0;i--)if(objects[i]._sequenceDestroyed)objects.splice(i,1);
}

export function drawSequenceMessages(ctx,width,height){
 if(!sequenceRuntime.messages.length)return;
 ctx.save();ctx.font='12px system-ui';ctx.textAlign='center';
 sequenceRuntime.messages.slice(-3).forEach((m,i)=>{
  const y=height-175-i*34;ctx.fillStyle='#162c3be8';ctx.fillRect(width/2-195,y-18,390,28);
  ctx.fillStyle='#e0ffef';ctx.fillText(m.text,width/2,y+1,365);
 });
 ctx.restore();
}
