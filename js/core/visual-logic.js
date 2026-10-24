// WarLike visual logic: original event/condition/action engine, inspired by visual-scripting workflows.
import {state} from './state.js';
export const eventTypes=['onStart','onInteract','onEnter','onExit','onUpdate'];
export const actionTypes=['message','setVariable','addVariable','heal','damage','teleport','destroy','changeColor','giveItem'];
export const conditionTypes=['always','variableEquals','variableAtLeast','hasItem','healthBelow'];
export const logic={globals:{},inventory:{},messages:[],activeZones:new Set(),started:false,lastInteract:false,healthDelta:0};
const player=()=>state.entities.find(o=>o.type==='character'||o.type==='player'||o.type==='prefab'&&['scout','soldier','medic','sniper','mechanic','survivor'].includes(o.assetId));
const nearby=(a,b,range=85)=>Math.hypot(a.x+a.w/2-b.x-b.w/2,a.y+a.h/2-b.y-b.h/2)<=range;
const numeric=value=>Number.isFinite(Number(value))?Number(value):0;
export function resetLogic(){logic.globals={};logic.inventory={};logic.messages=[];logic.activeZones.clear();logic.started=false;logic.lastInteract=false;logic.healthDelta=0}
const variable=(obj,name)=>obj.logic?.local?.[name]??logic.globals[name]??0;
function test(cond,obj,character){switch(cond.type){
 case 'always':return true;
 case 'variableEquals':return String(variable(obj,cond.key||'score'))===String(cond.value??0);
 case 'variableAtLeast':return numeric(variable(obj,cond.key||'score'))>=numeric(cond.value);
 case 'hasItem':return (logic.inventory[cond.key||'key']||0)>=Math.max(1,numeric(cond.value)||1);
 case 'healthBelow':return numeric(character?.hp??100)<numeric(cond.value);
 default:return false;
}}
function act(step,obj,character){const n=step.key||'score',amount=numeric(step.value),key=String(n).slice(0,50);switch(step.type){
case 'message':logic.messages.push({text:String(step.value||'Interaction activée').slice(0,150),ttl:3.5});break;
case 'setVariable':logic.globals[key]=step.value??0;break;
case 'addVariable':logic.globals[key]=numeric(logic.globals[key])+amount;break;
case 'heal':if(character)logic.healthDelta+=Math.max(0,amount||25);break;
case 'damage':if(character)logic.healthDelta-=Math.max(0,amount||10);break;
case 'teleport':if(character){character.x=numeric(step.x);character.y=numeric(step.y)}break;
case 'destroy':obj._logicDestroyed=true;break;
case 'changeColor':if(/^#[a-f\d]{6}$/i.test(String(step.value)))obj.color=step.value;break;
case 'giveItem':logic.inventory[key]=(logic.inventory[key]||0)+Math.max(1,amount||1);break;
}}
function fire(obj,event,character){const data=obj.logic;if(!data||data.event!==event||obj._logicDestroyed)return;if(data.once&&obj._logicFired)return;if((data.conditions||[]).some(c=>!test(c,obj,character)))return;for(const step of data.actions||[])act(step,obj,character);obj._logicFired=true}
export function updateLogic(dt){if(!state.playing)return;const character=player(),key=state.keys.has('e'),press=key&&!logic.lastInteract;logic.lastInteract=key;
for(const obj of state.entities){if(!obj.logic||obj._logicDestroyed)continue;if(!logic.started)fire(obj,'onStart',character);if(!character)continue;const inside=nearby(obj,character,Math.max(45,Number(obj.logic.radius)||85)),was=logic.activeZones.has(obj.id);
if(inside&&!was){logic.activeZones.add(obj.id);fire(obj,'onEnter',character)}
if(!inside&&was){logic.activeZones.delete(obj.id);fire(obj,'onExit',character)}
if(inside&&press)fire(obj,'onInteract',character);
if(inside)fire(obj,'onUpdate',character);
}
logic.started=true;logic.messages=logic.messages.filter(m=>(m.ttl-=dt)>0);
state.entities=state.entities.filter(obj=>!obj._logicDestroyed);
}
export function drawLogic(ctx,width,height){if(!state.playing)return;ctx.save();ctx.font='12px system-ui';ctx.textAlign='center';for(let i=0;i<logic.messages.length;i++){const m=logic.messages[i],y=height-116-i*35;ctx.fillStyle='#102a37e8';ctx.fillRect(width/2-185,y-18,370,30);ctx.fillStyle='#c3ffe6';ctx.fillText(m.text,width/2,y+1)}
const character=player();if(character){const active=state.entities.find(o=>o.logic?.event==='onInteract'&&nearby(o,character,Number(o.logic.radius)||85)&&!o._logicDestroyed);if(active){ctx.fillStyle='#172b35e8';ctx.fillRect(width/2-150,height-74,300,32);ctx.fillStyle='#fff';ctx.fillText('E — '+(active.logic.prompt||'Interagir : '+active.name),width/2,height-53)}}
ctx.restore()}
export function defaultLogic(){return {event:'onInteract',radius:85,once:false,prompt:'Interagir',local:{},conditions:[{type:'always',key:'',value:''}],actions:[{type:'message',key:'',value:'Bienvenue dans WarLike Studio !'}]}}
