// WarLike Sequences — no-code event, branch, instruction and signal runtime.
// Independent of the legacy 2D Visual Logic component; works in either workspace.
export const sequenceEvents=['start','interact','enter','exit','keyDown','interval','signal'];
export const sequenceConditions=['always','variable','localVariable','distanceLess','objectEnabled'];
export const sequenceInstructions=['message','setVariable','addVariable','setLocal','wait','moveObject','setColor','enableObject','emitSignal','destroyObject'];
export const newSequence=()=>({enabled:true,event:'interact',key:'e',radius:96,interval:2,signal:'',once:false,conditions:[],instructions:[{type:'message',value:'Bienvenue !'}]});
export const sequenceRuntime={globals:{},messages:[],time:0,pressed:new Set(),inside:new Set(),fired:new Set(),cooldowns:new Map(),jobs:[],signals:[]};
const number=(n,def=0)=>Number.isFinite(Number(n))?Number(n):def;
const MAX_ACTIONS=256,MAX_SIGNALS=64,MAX_JOBS=100;
const distance=(a,b)=>Math.hypot((a.x+a.w/2)-(b.x+b.w/2),(a.y+a.h/2)-(b.y+b.h/2));
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
 case 'objectEnabled':pass=o.sequenceEnabled!==false;break;
 default:pass=false;
 }
 return c.negate?!pass:pass;
}
export function chooseSequenceBranch(sequence,obj,ctx){
 if(!Array.isArray(sequence.branches)||!sequence.branches.length)return Array.isArray(sequence.instructions)?sequence.instructions:[];
 for(const branch of sequence.branches){if((branch.conditions||[]).every(c=>conditionPass(c,obj,ctx)))return branch.instructions||[]}
 return sequence.elseInstructions||[];
}
function execute(job,ctx,actionsLeft){
 const rt=sequenceRuntime,entity=ctx.entities.find(o=>o.id===job.objectId);
 if(!entity)return;
 let count=0;
 while(job.index<job.steps.length&&count<actionsLeft){
  const a=job.steps[job.index++];if(!a||a.disabled)continue;
  count++;
  const key=String(a.key||'score').slice(0,60),val=a.value;
  switch(a.type){
  case 'message':rt.messages.push({text:String(val||'Action exécutée').slice(0,160),ttl:3});break;
  case 'setVariable':rt.globals[key]=val??0;break;
  case 'addVariable':rt.globals[key]=number(rt.globals[key])+number(val);break;
  case 'setLocal':entity.sequenceLocal??={};entity.sequenceLocal[key]=val??0;break;
  case 'moveObject':entity.x+=number(a.x);entity.y+=number(a.y);break;
  case 'setColor':if(/^#[a-f0-9]{6}$/i.test(String(val))){entity.color=val;entity.colorCustomized=true}break;
  case 'enableObject':{const target=ctx.entities.find(o=>o.id===number(a.targetId))||entity;target.sequenceEnabled=val!==false&&String(val)!=='false';break}
  case 'emitSignal':emitSequenceSignal(val||key);break;
  case 'destroyObject':entity._sequenceDestroyed=true;break;
  case 'wait':job.wait=Math.min(120,Math.max(0,number(val,.5)));return count;
  }
 }
 return count;
}
export function updateSequences(dt,ctx){
 if(!ctx?.playing)return;
 const rt=sequenceRuntime;dt=Math.min(.1,Math.max(0,number(dt)));rt.time+=dt;
 const keys=ctx.keys||new Set(),player=ctx.player||null,objects=ctx.entities||[];
 const signals=rt.signals.splice(0,MAX_SIGNALS);let budget=MAX_ACTIONS;
 const start=(o,s)=>{
  if(rt.jobs.length>=MAX_JOBS||budget<=0)return;
  const id=o.id;if(s.once&&rt.fired.has(id))return;
  if(!(s.conditions||[]).every(c=>conditionPass(c,o,ctx)))return;
  rt.fired.add(id);const steps=chooseSequenceBranch(s,o,ctx).slice(0,MAX_ACTIONS);
  const job={objectId:id,steps,index:0,wait:0};
  budget-=execute(job,ctx,budget)||0;
  if(job.index<job.steps.length)rt.jobs.push(job);
 };
 for(const o of objects){
  const s=o.sequence;if(!s||s.enabled===false||o.sequenceEnabled===false||o._sequenceDestroyed)continue;
  const isInside=!!player&&distance(o,player)<=Math.max(0,number(s.radius,96));
  const wasInside=rt.inside.has(o.id);if(isInside)rt.inside.add(o.id);else rt.inside.delete(o.id);
  const k=String(s.key||'e').toLowerCase();const newKey=keys.has(k)&&!rt.pressed.has(k);
  let trigger=false;
  switch(s.event){
  case 'start':trigger=!rt.cooldowns.has('start:'+o.id);rt.cooldowns.set('start:'+o.id,Infinity);break;
  case 'interact':trigger=isInside&&newKey;break;
  case 'keyDown':trigger=newKey;break;
  case 'enter':trigger=isInside&&!wasInside;break;
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
