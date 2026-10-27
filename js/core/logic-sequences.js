import {recordEngineEvent} from './engine-diagnostics.js';
import {coerceVariable} from './blueprint-graph.js';
import {horror,triggerHorrorJumpscare} from './horror-survival.js';
import {inventoryAdd,inventoryRemove,equipItem,damage,ensureStats} from './gameplay-components.js';
// WarLike Sequences — no-code event, branch, instruction and signal runtime.
// Independent of the legacy 2D Visual Logic component; works in either workspace.
export const sequenceEvents=['start','interact','enter','exit','keyDown','interval','signal'];
export const sequenceConditions=['always','variable','localVariable','distanceLess','distanceGreater','objectEnabled','healthBelow','healthAbove','hasTag','playerInVehicle','playerOnFoot','randomChance'];
export const sequenceInstructions=['message','setVariable','addVariable','setLocal','addLocal','wait','moveObject','teleportObject','setColor','enableObject','setHealth','addHealth','setAnimation','setBehavior','emitSignal','destroyObject','giveItem','removeItem','equipItem','damageObject','healObject'];
export const newSequence=()=>({enabled:true,event:'interact',key:'e',radius:96,interval:2,signal:'',once:false,conditions:[],instructions:[{type:'message',value:'Bienvenue !'}]});
export const sequenceRuntime={globals:{},messages:[],time:0,pressed:new Set(),inside:new Set(),fired:new Set(),cooldowns:new Map(),jobs:[],signals:[]};
const number=(n,def=0)=>Number.isFinite(Number(n))?Number(n):def;
const MAX_ACTIONS=256,MAX_SIGNALS=64,MAX_JOBS=100;
const distance=(a,b)=>Math.hypot((number(a.x)+number(a.w)/2)-(number(b.x)+number(b.w)/2),(number(a.y)+number(a.h)/2)-(number(b.y)+number(b.h)/2));
const safeSteps=steps=>Array.isArray(steps)?steps.slice(0,MAX_ACTIONS):[];
const safeConditions=conditions=>Array.isArray(conditions)?conditions.slice(0,MAX_ACTIONS):[];
export function resetSequences(){sequenceRuntime.globals={};sequenceRuntime.messages=[];sequenceRuntime.time=0;sequenceRuntime.pressed.clear();sequenceRuntime.inside.clear();sequenceRuntime.fired.clear();sequenceRuntime.cooldowns.clear();sequenceRuntime.jobs=[];sequenceRuntime.signals=[]}
export const emitSequenceSignal=name=>{if(sequenceRuntime.signals.length<MAX_SIGNALS)sequenceRuntime.signals.push(String(name||'').slice(0,60))};
export function conditionPass(c,o,ctx){
 const value=c.scope==='local'?o.sequenceLocal?.[c.key]:sequenceRuntime.globals[c.key];
 const compare=(a,b,op)=>op==='>'?number(a)>number(b):op==='<'?number(a)<number(b):op==='>='?number(a)>=number(b):op==='<='?number(a)<=number(b):op==='!='?String(a)!==String(b):String(a)===String(b);
 let pass=false;
 switch(c.type){
 case 'always':pass=true;break;
 case 'variable':pass=compare(sequenceRuntime.globals[c.key],c.value,c.operator||'==');break;
 case 'localVariable':pass=compare(o.sequenceLocal?.[c.key],c.value,c.operator||'==');break;
 case 'distanceLess':pass=!!ctx.player&&distance(o,ctx.player)<Math.max(0,number(c.value,96));break;
 case 'distanceGreater':pass=!!ctx.player&&distance(o,ctx.player)>Math.max(0,number(c.value,96));break;
 case 'healthBelow':pass=number(o.hp,100)<number(c.value,50);break;
 case 'healthAbove':pass=number(o.hp,100)>number(c.value,50);break;
 case 'hasTag':pass=Array.isArray(o.tags)&&o.tags.includes(String(c.value??''));break;
 case 'playerInVehicle':pass=!!ctx.player?._hiddenInVehicle;break;
 case 'playerOnFoot':pass=!!ctx.player&&!ctx.player._hiddenInVehicle;break;
 case 'randomChance':pass=Math.random()<Math.max(0,Math.min(1,number(c.value,.5)));break;
 case 'objectEnabled':pass=o.sequenceEnabled!==false;break;
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
 if(!entity)return;
 let count=0;
 while(job.index<job.steps.length&&count<actionsLeft){
  const a=job.steps[job.index++];if(!a||a.disabled||typeof a.type!=='string')continue;
  count++;
  recordEngineEvent('blueprint',String(a.type)+' · '+String(entity.name||entity.id));
  const key=String(a.key||'score').slice(0,60),val=a.value;
  const targetObject=a.targetRole==='player'&&ctx.player?ctx.player:(ctx.entities.find(o=>o.id===number(a.targetId))||entity);
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
  case 'healObject':{const target=targetObject;const s=ensureStats(target);s.health=Math.min(s.maxHealth,s.health+Math.max(0,number(val,10)));target.hp=s.health;break}
  case 'setHealth':{const target=targetObject;target.hp=Math.max(0,number(val,100));break}
  case 'addHealth':{const target=targetObject;target.hp=Math.max(0,number(target.hp,100)+number(val));break}
  case 'setAnimation':{const target=targetObject;target.animation=String(val||'idle').slice(0,64);break}
  case 'setBehavior':{const target=targetObject;const behavior=String(val||'none');if(['none','patrol','chase','guard','wander','flee','follow'].includes(behavior))target.behavior=behavior;break}
  case 'setColor':if(/^#[a-f0-9]{6}$/i.test(String(val))){entity.color=val;entity.colorCustomized=true}break;
  case 'enableObject':{const target=targetObject;target.sequenceEnabled=val!==false&&String(val)!=='false';break}
  case 'emitSignal':if(horror.enabled&&String(val||key)==='horror:jumpscare')triggerHorrorJumpscare();emitSequenceSignal(val||key);break;
  case 'destroyObject':entity._sequenceDestroyed=true;break;
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
 for(const job of rt.jobs){if(job.wait>0){job.wait-=dt;if(job.wait>0)continue}if(budget>0)budget-=execute(job,ctx,budget)||0}
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
