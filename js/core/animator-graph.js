import {blendSamples2d,machineAncestors,resolveMachineState,inspectMachines,transitionOrigins} from './animator-advanced.js';
import {animationEventsBetween} from './animation-clips.js';
import {resolveAnimationClip} from './gltf-animation.js';
const n=(v,d=0)=>Number.isFinite(Number(v))?Number(v):d,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const condition=(parameter,value,operator='==')=>({parameter,operator,value});
export function defaultAnimatorGraph(){
 const states=[['motion','Locomotion','idle',true],['jump','Saut','jump',false],['fall','Chute','fall',true],['attack','Attaque','attack',false],['cast','Pouvoir','attack',false],['flight','Vol','fly',true],['death','Mort','death',false]].map(([id,name,clip,loop],i)=>({id,name,clip,loop,speed:1,duration:id==='cast'?.55:id==='attack'?.4:1,x:i?400+((i-1)%2)*270:70,y:i?45+Math.floor((i-1)/2)*145:240,events:[]}));
 states[0].blend=[{clip:'idle',threshold:0},{clip:'walk',threshold:4.2},{clip:'run',threshold:7}];states[0].parameter='speed';
 const transitions=[['death',[condition('dead',true)]],['cast',[condition('casting',true)]],['attack',[condition('attacking',true)]],['flight',[condition('flight',true)]],['jump',[condition('grounded',false),condition('vertical',0,'>')]],['fall',[condition('grounded',false)]]].map(([to,conditions])=>({from:'*',to,conditions:to==='death'?conditions:[condition('dead',false),...conditions],blend:.18}));
 for(const from of ['attack','cast'])transitions.push({from,to:'motion',conditions:[condition('attacking',false),condition('casting',false)],hasExitTime:true,exitTime:1,blend:.18});
 for(const from of ['jump','fall','flight','death'])transitions.push({from,to:'motion',conditions:[condition('grounded',true),condition('flight',false),condition('dead',false)],blend:.18});
 return {enabled:true,entry:'motion',states,transitions,layers:[],parameters:[]};
}
const safeParameter=name=>typeof name==='string'&&/^[-a-zA-Z0-9_]{1,40}$/.test(name)&&!['__proto__','constructor','prototype'].includes(name);
export function inspectAnimatorGraph(graph){
 if(!graph||!Array.isArray(graph.states)||!Array.isArray(graph.transitions))return ['Graphe Animator invalide.'];if(!graph.states.length||graph.states.length>32||graph.transitions.length>96)return ['Limite : 32 états et 96 transitions.'];
 const ids=new Set(),errors=[];
 for(const s of graph.states){
  if(!s||typeof s.id!=='string'||!s.id||s.id.length>80||ids.has(s.id)){errors.push('Identifiant d’état vide ou dupliqué.');continue}ids.add(s.id);
  if(typeof s.clip!=='string'||!s.clip||s.clip.length>160)errors.push('Clip d’état absent.');
  if(s.duration!=null&&(!Number.isFinite(s.duration)||s.duration<.05||s.duration>3600)||s.speed!=null&&(!Number.isFinite(s.speed)||s.speed<.05||s.speed>4))errors.push('Durée ou vitesse d’état invalide.');
  if(s.events!=null&&(!Array.isArray(s.events)||s.events.length>32||s.events.some(e=>!e||!Number.isFinite(e.time)||e.time<0||e.time>1||!['signal','fx','sound'].includes(e.type)||typeof e.value!=='string'||e.value.length>100)))errors.push('Événements Animator invalides.');
  if(s.blend2d!=null&&(!Array.isArray(s.blend2d)||s.blend2d.length<1||s.blend2d.length>16||s.blend2d.some(p=>!p||typeof p.clip!=='string'||!p.clip||!Number.isFinite(p.x)||!Number.isFinite(p.y))||new Set(s.blend2d.map(p=>p?.x+':'+p?.y)).size!==s.blend2d.length||!safeParameter(s.parameterX)||!safeParameter(s.parameterY)))errors.push('Mélange 2D invalide.');
  if(s.blend!=null){if(!Array.isArray(s.blend)||s.blend.length>16||s.blend.some(p=>!p||typeof p.clip!=='string'||!p.clip||!Number.isFinite(p.threshold))||new Set(s.blend.map(p=>p?.threshold)).size!==s.blend.length||s.parameter!=null&&!safeParameter(s.parameter))errors.push('Mélange 1D invalide : clips, seuils distincts et paramètre attendus.');}
 }
 const machineErrors=inspectMachines(graph);errors.push(...machineErrors);if(!resolveMachineState(graph,graph.entry))errors.push('État d’entrée absent.');
 const known=id=>ids.has(id)||typeof id==='string'&&id.startsWith('@')&&!!resolveMachineState(graph,id);
 for(const t of graph.transitions){
  if(!t||!known(t.to)||t.from!=='*'&&!known(t.from))errors.push('Transition vers un état absent.');
  if(!Array.isArray(t?.conditions)||t.conditions.length>12||t.conditions.some(c=>!c||!safeParameter(c.parameter)||!['==','!=','>','>=','<','<=','trigger'].includes(c.operator||'==')||c.operator!=='trigger'&&!['number','string','boolean'].includes(typeof c.value)||typeof c.value==='number'&&!Number.isFinite(c.value)))errors.push('Conditions de transition invalides.');
  if(t?.interruptionSource!=null&&!transitionOrigins.includes(t.interruptionSource))errors.push('Source d’interruption invalide.');
  if(t?.blend!=null&&(!Number.isFinite(t.blend)||t.blend<0||t.blend>3)||t?.hasExitTime&&(!Number.isFinite(t.exitTime)||t.exitTime<0||t.exitTime>100)||t?.offset!=null&&(!Number.isFinite(t.offset)||t.offset<0||t.offset>1))errors.push('Fondu, temps de sortie ou décalage invalide.');
 }
 if(graph.layers!=null&&(!Array.isArray(graph.layers)||graph.layers.length>4||graph.layers.some(l=>!l||typeof l.clip!=='string'||l.mode!=null&&!['override','additive'].includes(l.mode)||l.speed!=null&&(!Number.isFinite(l.speed)||l.speed<.05||l.speed>4)||l.offset!=null&&(!Number.isFinite(l.offset)||l.offset<0||l.offset>1)||!Number.isFinite(l.weight)||l.weight<0||l.weight>1||l.bones!=null&&(!Array.isArray(l.bones)||l.bones.length>32||l.bones.some(b=>typeof b!=='string'||b.length>160)))))errors.push('Couches Animator invalides.');
 if(graph.parameters!=null&&(!Array.isArray(graph.parameters)||graph.parameters.length>32||new Set(graph.parameters.map(p=>p?.name)).size!==graph.parameters.length||graph.parameters.some(p=>!p||!safeParameter(p.name)||!['float','int','bool','trigger','string'].includes(p.type)||(['float','int'].includes(p.type)?!Number.isFinite(p.default)||p.type==='int'&&!Number.isInteger(p.default):['bool','trigger'].includes(p.type)?typeof p.default!=='boolean':typeof p.default!=='string'))))errors.push('Paramètres Animator invalides.');
 return [...new Set(errors)];
}
export function animatorBlendSamples(state,parameters){
 if(state.blend2d?.length)return blendSamples2d(state.blend2d,n(parameters[state.parameterX]),n(parameters[state.parameterY]));
 const points=(state.blend||[]).filter(p=>p&&typeof p.clip==='string'&&Number.isFinite(Number(p.threshold))).sort((a,b)=>a.threshold-b.threshold).slice(0,16);
 if(!points.length)return [{clip:state.clip||'idle',weight:1}];const value=n(parameters[state.parameter||'speed']);if(value<=points[0].threshold)return [{clip:points[0].clip,weight:1}];if(value>=points.at(-1).threshold)return [{clip:points.at(-1).clip,weight:1}];
 const upper=points.findIndex(p=>p.threshold>=value),a=points[upper-1],b=points[upper],weight=(value-a.threshold)/Math.max(.001,b.threshold-a.threshold);return [{clip:a.clip,weight:1-weight},{clip:b.clip,weight}];
}
const matches=(c,p)=>{if(c.operator==='trigger')return p[c.parameter]===true;const a=p[c.parameter];if(a===undefined||typeof a==='number'&&!Number.isFinite(Number(c.value)))return false;const b=typeof a==='number'?n(c.value):typeof a==='boolean'?c.value===true||c.value==='true':String(c.value);switch(c.operator){case '!=':return a!==b;case '>':return a>b;case '>=':return a>=b;case '<':return a<b;case '<=':return a<=b;default:return a===b}};
let tracks=new WeakMap();
export function resetAnimators(){tracks=new WeakMap()}
export function noteAnimatorAction(owner,action='attack',duration=.45){owner._animatorAction={action:String(action).slice(0,40),remaining:clamp(n(duration,.45),.05,10)}}
export function stepAnimator(owner,dt,{mode='3d',preview=false,parameters={},onEvent=()=>{}}={}){
 const graph=owner.animatorGraph;if(owner.enabled===false||!graph||graph.enabled===false||inspectAnimatorGraph(graph).length)return null;const frame=clamp(n(dt),0,.1);let track=tracks.get(owner);if(!track||track.graph!==graph||!graph.states.some(s=>s.id===track.id)){track={graph,id:resolveMachineState(graph,graph.entry),time:0,elapsed:0,blend:1,lastX:n(owner.x),lastY:n(owner.y),lastZ:n(owner.elevation3d),previous:null,serial:0};tracks.set(owner,track);onEvent({type:'signal',value:'animation:'+track.id+':enter'},owner);for(const id of machineAncestors(graph,track.id).reverse())onEvent({type:'signal',value:'animation:machine:'+id+':enter'},owner)}
 const action=owner._animatorAction;const speed=frame?Math.hypot(n(owner.x)-track.lastX,n(owner.y)-track.lastY)/(64*frame):0,vertical=frame?(n(owner.elevation3d)-track.lastZ)/frame:0;
 const declared=Object.fromEntries((graph.parameters||[]).map(p=>[p.name,p.default]));
 const localYaw=n(owner.rotation)*Math.PI/180,vx=frame?(n(owner.x)-track.lastX)/(64*frame):0,vz=frame?(n(owner.y)-track.lastY)/(64*frame):0;
 const p={...declared,moveX:vx*Math.cos(localYaw)+vz*Math.sin(localYaw),moveY:-vx*Math.sin(localYaw)+vz*Math.cos(localYaw),speed:Math.min(60,speed),vertical,grounded:mode==='2d'?owner.controller2d?.mode==='topDown'||owner.grounded2d!==false:owner.grounded3d!==false,flight:!!owner.heroState?.flight,dead:n(owner.stats?.health??owner.hp,100)<=0,casting:!!action&&action.remaining>0&&action.action!=='attack',attacking:!!action&&action.remaining>0&&action.action==='attack',action:action?.action||'',...owner.animatorParameters,...parameters};
 if(preview){p.moveX=n(graph.previewX);p.moveY=n(graph.previewY);p.speed=n(graph.previewSpeed,4.2);p.grounded=true;p.vertical=0}
 const forced=owner._animatorForced;let current=graph.states.find(s=>s.id===track.id)||graph.states[0];
 const durationOf=s=>Math.max(.05,n(s.duration,1)),projected=track.time+frame*clamp(n(current.speed,1),.05,4);
 const exitReady=t=>{if(!t.hasExitTime)return true;const prior=track.previous,source=prior&&(t.from===prior.state.id||t.from?.startsWith('@')&&machineAncestors(graph,prior.state.id).includes(t.from.slice(1)))?prior.state:current,elapsed=source===current?track.time:prior.time,duration=durationOf(source),after=elapsed+frame*clamp(n(source.speed,1),.05,4),at=t.exitTime;if(source.loop!==false&&at<1)return animationEventsBetween([{time:at}],elapsed,after,duration,{loop:true,normalized:true}).length>0;return after/duration+1e-9>=at;};
 const active=track.previous&&track.blend<1?track.transition:null,source=active?.interruptionSource??'current';
 const sourceIds=!active?[track.id]:source==='none'?[]:source==='current'?[active.from]:source==='next'?[track.id]:source==='nextThenCurrent'?[track.id,active.from]:[active.from,track.id];
 const fromMatches=(t,id)=>t.from===id||t.from?.startsWith('@')&&machineAncestors(graph,id).includes(t.from.slice(1));
 const candidates=[...graph.transitions.filter(t=>t.from==='*'),...sourceIds.flatMap(id=>graph.transitions.filter(t=>t.from!=='*'&&fromMatches(t,id)))];
 const transition=candidates.find(t=>{const index=graph.transitions.indexOf(t);return (!active||t.from==='*'||!active.orderedInterruption||index<active.index)&&exitReady(t)&&t.conditions.every(c=>matches(c,p))&&(resolveMachineState(graph,t.to)!==track.id||t.canTransitionToSelf)});
 const forcing=!p.dead&&forced?.remaining>0&&graph.states.some(s=>s.id===forced.stateId),next=forcing?forced.stateId:resolveMachineState(graph,transition?.to)||track.id;
 if(next!==track.id||forcing&&forced.restart||!forcing&&transition?.canTransitionToSelf){
  const oldMachines=machineAncestors(graph,track.id),newMachines=machineAncestors(graph,next);for(const id of oldMachines.filter(id=>!newMachines.includes(id)))onEvent({type:'signal',value:'animation:machine:'+id+':exit'},owner);for(const id of newMachines.filter(id=>!oldMachines.includes(id)).reverse())onEvent({type:'signal',value:'animation:machine:'+id+':enter'},owner);
  const composite=track.previous&&track.blend<1?[...(track.previous.composite||animatorBlendSamples(track.previous.state,track.previous.parameters).map(s=>({...s,time:track.previous.time,loop:track.previous.state.loop!==false}))).map(s=>({...s,weight:s.weight*(1-track.blend)})),...animatorBlendSamples(current,p).map(s=>({...s,time:track.time,loop:current.loop!==false,weight:s.weight*track.blend}))]:null;
  if(composite){composite.sort((a,b)=>b.weight-a.weight);composite.splice(32);const total=composite.reduce((sum,s)=>sum+s.weight,0)||1;for(const sample of composite)sample.weight/=total;}
  track.transition={from:track.id,index:graph.transitions.indexOf(transition),interruptionSource:transition?.interruptionSource??'current',orderedInterruption:transition?.orderedInterruption===true};
  track.previous={state:current,time:track.time,parameters:track.parameters||p,composite};track.id=next;current=graph.states.find(s=>s.id===next);
  track.time=forcing?(forced.offset||0)*durationOf(current):clamp(n(transition?.offset),0,1)*durationOf(current);track.blend=0;track.duration=clamp(n(forcing?forced.fade??transition?.blend:transition?.blend,.18),0,3)*(!forcing&&transition?.fixedDuration===false?durationOf(track.previous.state):1);track.serial++;
  if(forcing)forced.restart=false;else for(const c of transition?.conditions||[])if(c.operator==='trigger'){owner.animatorParameters??={};owner.animatorParameters[c.parameter]=false;}
  onEvent({type:'signal',value:'animation:'+next+':enter'},owner);
 }
 track.elapsed+=frame;const before=track.time;track.time+=frame*clamp(n(current.speed,1),.05,4);track.blend=track.duration?Math.min(1,track.blend+frame/track.duration):1;const duration=durationOf(current);
 if(track.previous){track.previous.time+=frame*clamp(n(track.previous.state.speed,1),.05,4);for(const sample of track.previous.composite||[])sample.time+=frame;if(track.blend>=1)track.previous=null;}
 for(const event of animationEventsBetween(current.events,before,track.time,duration,{loop:current.loop!==false,normalized:true}))onEvent(event,owner);
 if(forced){forced.remaining=Math.max(0,forced.remaining-frame);if(!forced.remaining)delete owner._animatorForced;}
 const samples=animatorBlendSamples(current,p);owner._animatorFrame={stateId:current.id,name:current.name,clip:current.clip,samples,time:track.time,layerTime:track.elapsed,delta:frame*clamp(n(current.speed,1),.05,4),machinePath:machineAncestors(graph,current.id),normalizedTime:track.time/duration,duration,loop:current.loop!==false,blend:track.blend,previous:track.previous,parameters:p,layers:(graph.layers||[]).slice(0,4)};
 if(mode==='2d'&&!preview)owner.animation=samples.reduce((a,b)=>a.weight>b.weight?a:b).clip;
 if(action&&!preview){action.remaining=Math.max(0,action.remaining-frame);if(!action.remaining)delete owner._animatorAction}
 track.lastX=n(owner.x);track.lastY=n(owner.y);track.lastZ=n(owner.elevation3d);track.parameters=p;return owner._animatorFrame;
}
export function animatorPoseOptions(frame,clips,mapping={}){
 const convert=(samples,time,loop)=>samples.map(s=>({clip:resolveAnimationClip(clips,s.clip,mapping),weight:s.weight,time,loop})).filter(s=>s.clip);
 const samples=convert(frame.samples,frame.time,frame.loop),previous=frame.previous?{samples:frame.previous.composite?frame.previous.composite.flatMap(s=>convert([s],s.time,s.loop)):convert(animatorBlendSamples(frame.previous.state,frame.previous.parameters),frame.previous.time,frame.previous.state.loop!==false)}:null;
 const layers=(frame.layers||[]).filter(l=>l.enabled!==false).map(l=>({...l,clip:resolveAnimationClip(clips,l.clip,mapping),time:(frame.layerTime??frame.time)*n(l.speed,1)+n(l.offset)*n(resolveAnimationClip(clips,l.clip,mapping)?.duration)})).filter(l=>l.clip);return {samples,previous,blend:frame.blend,layers,loop:frame.loop};
}

export function playAnimatorState(owner,stateId,duration=null,{fade=null,offset=0}={}){const state=owner.animatorGraph?.states.find(s=>s.id===stateId);if(!state)return false;owner._animatorForced={stateId,restart:true,fade,offset:clamp(n(offset),0,1),remaining:Math.max(.05,Math.min(10,n(duration??state.duration??1,1)))};return true}
export function setAnimatorParameter(owner,key,value){if(!safeParameter(key)||!['string','number','boolean'].includes(typeof value)||typeof value==='number'&&!Number.isFinite(value))return false;const declaration=owner.animatorGraph?.parameters?.find(p=>p.name===key);if(declaration&&(['float','int'].includes(declaration.type)?typeof value!=='number'||declaration.type==='int'&&!Number.isInteger(value):['bool','trigger'].includes(declaration.type)?typeof value!=='boolean':typeof value!=='string'))return false;owner.animatorParameters??={};owner.animatorParameters[key]=value;return true}

export const setAnimatorTrigger=(owner,key)=>setAnimatorParameter(owner,key,true);
export const resetAnimatorTrigger=(owner,key)=>setAnimatorParameter(owner,key,false);
