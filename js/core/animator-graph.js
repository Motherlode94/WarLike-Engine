import {resolveAnimationClip} from './gltf-animation.js';
const n=(v,d=0)=>Number.isFinite(Number(v))?Number(v):d,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const condition=(parameter,value,operator='==')=>({parameter,operator,value});
export function defaultAnimatorGraph(){
 const states=[['motion','Locomotion','idle',true],['jump','Saut','jump',false],['fall','Chute','fall',true],['attack','Attaque','attack',false],['cast','Pouvoir','attack',false],['flight','Vol','fly',true],['death','Mort','death',false]].map(([id,name,clip,loop],i)=>({id,name,clip,loop,speed:1,duration:id==='cast'?.55:id==='attack'?.4:1,x:i?400+((i-1)%2)*270:70,y:i?45+Math.floor((i-1)/2)*145:240,events:[]}));
 states[0].blend=[{clip:'idle',threshold:0},{clip:'walk',threshold:4.2},{clip:'run',threshold:7}];states[0].parameter='speed';
 const transitions=[['death',[condition('dead',true)]],['cast',[condition('casting',true)]],['attack',[condition('attacking',true)]],['flight',[condition('flight',true)]],['jump',[condition('grounded',false),condition('vertical',0,'>')]],['fall',[condition('grounded',false)]],['motion',[]]].map(([to,conditions])=>({from:'*',to,conditions,blend:.18}));
 return {enabled:true,entry:'motion',states,transitions,layers:[]};
}
export function inspectAnimatorGraph(graph){
 if(!graph||!Array.isArray(graph.states)||!Array.isArray(graph.transitions))return ['Graphe Animator invalide.'];if(!graph.states.length||graph.states.length>32||graph.transitions.length>96)return ['Limite : 32 états et 96 transitions.'];
 const ids=new Set(),errors=[];for(const s of graph.states){if(!s||typeof s.id!=='string'||!s.id||ids.has(s.id))errors.push('Identifiant d’état vide ou dupliqué.');else ids.add(s.id)}if(!ids.has(graph.entry))errors.push('État d’entrée absent.');
 for(const t of graph.transitions){if(!t||!ids.has(t.to)||t.from!=='*'&&!ids.has(t.from))errors.push('Transition vers un état absent.');if(!Array.isArray(t?.conditions)||t.conditions.length>12)errors.push('Conditions de transition invalides.')}
 return [...new Set(errors)];
}
export function animatorBlendSamples(state,parameters){
 const points=(state.blend||[]).filter(p=>p&&typeof p.clip==='string'&&Number.isFinite(Number(p.threshold))).sort((a,b)=>a.threshold-b.threshold).slice(0,16);
 if(!points.length)return [{clip:state.clip||'idle',weight:1}];const value=n(parameters[state.parameter||'speed']);if(value<=points[0].threshold)return [{clip:points[0].clip,weight:1}];if(value>=points.at(-1).threshold)return [{clip:points.at(-1).clip,weight:1}];
 const upper=points.findIndex(p=>p.threshold>=value),a=points[upper-1],b=points[upper],weight=(value-a.threshold)/Math.max(.001,b.threshold-a.threshold);return [{clip:a.clip,weight:1-weight},{clip:b.clip,weight}];
}
const matches=(c,p)=>{const a=p[c.parameter],b=typeof a==='number'?n(c.value):typeof a==='boolean'?c.value===true||c.value==='true':String(c.value);switch(c.operator){case '!=':return a!==b;case '>':return a>b;case '>=':return a>=b;case '<':return a<b;case '<=':return a<=b;default:return a===b}};
let tracks=new WeakMap();
export function resetAnimators(){tracks=new WeakMap()}
export function noteAnimatorAction(owner,action='attack',duration=.45){owner._animatorAction={action:String(action).slice(0,40),remaining:clamp(n(duration,.45),.05,10)}}
export function stepAnimator(owner,dt,{mode='3d',preview=false,parameters={},onEvent=()=>{}}={}){
 const graph=owner.animatorGraph;if(!graph||graph.enabled===false||inspectAnimatorGraph(graph).length)return null;const frame=clamp(n(dt),0,.1);let track=tracks.get(owner);if(!track){track={id:graph.entry,time:0,blend:1,lastX:n(owner.x),lastY:n(owner.y),lastZ:n(owner.elevation3d),previous:null,serial:0};tracks.set(owner,track)}
 const action=owner._animatorAction;const speed=frame?Math.hypot(n(owner.x)-track.lastX,n(owner.y)-track.lastY)/(64*frame):0,vertical=frame?(n(owner.elevation3d)-track.lastZ)/frame:0;
 const p={speed:Math.min(60,speed),vertical,grounded:mode==='2d'?owner.controller2d?.mode==='topDown'||owner.grounded2d!==false:owner.grounded3d!==false,flight:!!owner.heroState?.flight,dead:n(owner.stats?.health??owner.hp,100)<=0,casting:!!action&&action.remaining>0&&action.action!=='attack',attacking:!!action&&action.remaining>0&&action.action==='attack',action:action?.action||'',...owner.animatorParameters,...parameters};
 if(preview){p.speed=n(graph.previewSpeed,4.2);p.grounded=true;p.vertical=0}
 const forced=owner._animatorForced;if(forced){forced.remaining-=frame;if(forced.remaining<=0)delete owner._animatorForced}
 const transition=graph.transitions.find(t=>(t.from==='*'||t.from===track.id)&&t.conditions.every(c=>matches(c,p))),next=!p.dead&&forced?.remaining>0&&graph.states.some(s=>s.id===forced.stateId)?forced.stateId:transition?.to||track.id;let current=graph.states.find(s=>s.id===track.id)||graph.states[0];
 if(next!==track.id){track.previous={state:current,time:track.time,parameters:track.parameters||p};track.id=next;track.time=0;track.blend=0;track.duration=clamp(n(transition?.blend,.18),0,3);track.serial++;current=graph.states.find(s=>s.id===next);onEvent({type:'signal',value:'animation:'+next+':enter'},owner)}
 const before=track.time;track.time+=frame*clamp(n(current.speed,1),.05,4);track.blend=track.duration?Math.min(1,track.blend+frame/track.duration):1;const duration=Math.max(.05,n(current.duration,1));
 for(const event of (current.events||[]).slice(0,32)){const at=clamp(n(event.time),0,1-Number.EPSILON)*duration,start=current.loop?Math.floor(before/duration):0,end=current.loop?Math.min(start+3,Math.floor(track.time/duration)):0;for(let cycle=start;cycle<=end;cycle++)if(cycle*duration+at>=before&&cycle*duration+at<track.time)onEvent(event,owner)}
 const samples=animatorBlendSamples(current,p);owner._animatorFrame={stateId:current.id,name:current.name,clip:current.clip,samples,time:track.time,loop:current.loop!==false,blend:track.blend,previous:track.previous,parameters:p,layers:(graph.layers||[]).slice(0,4)};
 if(mode==='2d'&&!preview)owner.animation=samples.reduce((a,b)=>a.weight>b.weight?a:b).clip;
 if(action&&!preview){action.remaining=Math.max(0,action.remaining-frame);if(!action.remaining)delete owner._animatorAction}
 track.lastX=n(owner.x);track.lastY=n(owner.y);track.lastZ=n(owner.elevation3d);track.parameters=p;return owner._animatorFrame;
}
export function animatorPoseOptions(frame,clips,mapping={}){
 const convert=(samples,time,loop)=>samples.map(s=>({clip:resolveAnimationClip(clips,s.clip,mapping),weight:s.weight,time,loop})).filter(s=>s.clip);
 const samples=convert(frame.samples,frame.time,frame.loop),previous=frame.previous?{samples:convert(animatorBlendSamples(frame.previous.state,frame.previous.parameters),frame.previous.time,frame.previous.state.loop!==false)}:null;
 const layers=frame.layers.filter(l=>l.enabled!==false).map(l=>({...l,clip:resolveAnimationClip(clips,l.clip,mapping),time:frame.time})).filter(l=>l.clip);return {samples,previous,blend:frame.blend,layers,loop:frame.loop};
}

export function playAnimatorState(owner,stateId,duration=null){const state=owner.animatorGraph?.states.find(s=>s.id===stateId);if(!state)return false;owner._animatorForced={stateId,remaining:Math.max(.05,Math.min(10,n(duration,state.duration||1)))};return true}
export function setAnimatorParameter(owner,key,value){if(typeof key!=='string'||!/^[-a-zA-Z0-9_]{1,40}$/.test(key)||['__proto__','constructor','prototype'].includes(key)||!['string','number','boolean'].includes(typeof value))return false;owner.animatorParameters??={};owner.animatorParameters[key]=value;return true}
