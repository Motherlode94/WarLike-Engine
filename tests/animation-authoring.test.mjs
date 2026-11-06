import test from 'node:test';
import assert from 'node:assert/strict';
import {sampleClip,createClip,putAnimationKey,inspectAnimationStudio,AnimationPreview,animationEditorPreview,stepAnimationClip,resetAnimationClips,animationEventsBetween} from '../js/core/animation-clips.js';
import {defaultAnimatorGraph,inspectAnimatorGraph,stepAnimator,animatorPoseOptions,setAnimatorParameter,setAnimatorTrigger,playAnimatorState,resetAnimators} from '../js/core/animator-graph.js';
import {stepEntityAnimations} from '../js/core/animation-runtime.js';
import {canonicalScene,runtimeEntities} from '../js/core/scene-contract.js';
import {prepareGameDefinition} from '../js/core/game-build.js';
import {freshGameProject} from '../js/core/game-project.js';
import {createScriptApi} from '../js/core/war-script-runtime.js';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
const authored=()=>{const clip=createClip('Ascenseur',1);clip.keys=[{time:0,x:0,easing:'linear'},{time:1,x:100,easing:'linear'}];clip.events=[{time:0,name:'started'},{time:.5,name:'middle'},{time:1,name:'finished'}];return {id:1,name:'Plateforme',type:'player',color:'#8195ef',x:0,y:20,w:30,h:30,animationStudio:{clips:[clip],defaultClip:0,playOnStart:true}}};
const graph=()=>({enabled:true,entry:'a',states:[{id:'a',name:'A',clip:'idle',duration:1,loop:false,speed:1,events:[]},{id:'b',name:'B',clip:'walk',duration:2,loop:true,speed:1,events:[]}],transitions:[{from:'a',to:'b',conditions:[],hasExitTime:true,exitTime:.5,blend:.5}],layers:[]});

test('authored clips sample sparse channels without leaking key metadata to the entity',()=>{
 const clip=createClip();clip.keys=[{time:0,x:10,easing:'linear'},{time:1,y:20},{time:2,x:30,y:40}];assert.deepEqual(sampleClip(clip,0),{x:10,y:20});assert.deepEqual(sampleClip(clip,1),{x:20,y:20});assert.deepEqual(sampleClip(clip,100),{x:30,y:40});assert.equal(sampleClip(createClip(),1),null);
});
for(const [easing,expected] of [['linear',.25],['step',0],['easeIn',.0625],['easeOut',.4375],['easeInOut',.15625]])test('authored clip interpolation '+easing,()=>{
 const clip=createClip();clip.keys=[{time:0,x:0,easing},{time:1,x:1}];near(sampleClip(clip,.25).x,expected);near(sampleClip(clip,1).x,1);
});
test('recording a key replaces only its instant and preserves transforms and interpolation',()=>{
 const clip=createClip();putAnimationKey(clip,0,{x:1,rotation:90,time:99,untrusted:'extra'});putAnimationKey(clip,1,{x:10},{easing:'easeOut'});putAnimationKey(clip,0,{x:3},{easing:'step'});assert.equal(clip.keys.length,2);assert.deepEqual(clip.keys[0],{time:0,x:3,easing:'step'});assert.equal(clip.keys[1].easing,'easeOut');assert.throws(()=>putAnimationKey(clip,1,{}),/transformation/);
});
test('preview restores missing fields and the original owner when selection changes',()=>{
 const first={x:7,y:4,rotation:12},other={x:50},clip=createClip(),preview=new AnimationPreview();clip.keys=[{time:0,x:10,elevation3d:2},{time:2,x:20,elevation3d:4}];const original=structuredClone(first);preview.seek(first,clip,1);near(first.x,15);assert.equal(first.time,undefined);preview.seek(other,clip,2);assert.deepEqual(first,original);preview.stop();preview.stop();assert.deepEqual(other,{x:50});
});
test('authoring validation reports invalid times, duplicate keys, dimensions and events',()=>{
 const owner=authored();assert.deepEqual(inspectAnimationStudio(owner.animationStudio),[]);
 for(const change of [c=>c.duration=0,c=>c.keys.push({time:0,x:1}),c=>c.keys[0].w=-3,c=>c.keys[0].easing='broken',c=>c.events.push({time:Infinity,name:'bad'})]){const bad=structuredClone(owner.animationStudio);change(bad.clips[0]);assert.ok(inspectAnimationStudio(bad).length)}
});
test('clip playback freezes on disable, resumes, clamps its end and emits boundary signals once',()=>{
 resetAnimationClips();const owner=authored(),events=[];const step=()=>stepAnimationClip(owner,.1,{onEvent:e=>events.push(e.value)});step();near(owner.x,10);owner.enabled=false;step();near(owner.x,10);owner.enabled=true;for(let i=0;i<14;i++)step();near(owner.x,100);assert.deepEqual(events,['started','middle','finished']);assert.equal(step().finished,true);
});
test('looping clips cross start/end events without dropping repeated loops or duplicating boundaries',()=>{
 const events=[{time:0,name:'start'},{time:1,name:'end'}];assert.deepEqual(animationEventsBetween(events,0,2.1,1,{loop:true}).map(e=>e.name),['start','end','start','end','start']);assert.deepEqual(animationEventsBetween(events,1,1.1,1,{loop:true}),[]);
});
test('authored clips survive canonical round trips and Web exports; invalid active graphs block export',()=>{
 const owner=authored();const canonical=canonicalScene([owner]);assert.ok(canonical.objects[0].components.some(c=>c.type==='animationStudio'));assert.deepEqual(runtimeEntities(canonical)[0].animationStudio,owner.animationStudio);const built=prepareGameDefinition({entities:[owner],project:freshGameProject()});assert.deepEqual(built.project.scenes[0].entities[0].animationStudio,owner.animationStudio);
 owner.animatorGraph=graph();owner.animatorGraph.transitions[0].conditions=[null];assert.throws(()=>prepareGameDefinition({entities:[owner],project:freshGameProject()}),/Conditions/);delete owner.animatorGraph;owner.animationStudio.clips[0].keys[0].time=-1;assert.throws(()=>prepareGameDefinition({entities:[owner],project:freshGameProject()}),/Instants/);
});
test('building the currently previewed object exports its original scene pose',()=>{
 const owner=authored();owner.x=45;animationEditorPreview.seek(owner,owner.animationStudio.clips[0],.8);assert.equal(owner.x,80);const built=prepareGameDefinition({entities:[owner],project:freshGameProject()});assert.equal(owner.x,45);assert.equal(built.project.scenes[0].entities[0].x,45);assert.equal(animationEditorPreview.owner,null);
});
test('Animator waits for exit time, applies destination offset and keeps the old clip moving through its fade',()=>{
 resetAnimators();const owner={x:0,y:0,animatorGraph:graph()};for(let i=0;i<4;i++)assert.equal(stepAnimator(owner,.1).stateId,'a');owner.animatorGraph.transitions[0].offset=.25;const frame=stepAnimator(owner,.1);assert.equal(frame.stateId,'b');near(frame.time,.6);near(frame.previous.time,.5);const next=stepAnimator(owner,.1);near(next.previous.time,.6);near(next.blend,.4);const options=animatorPoseOptions(next,[{name:'idle'},{name:'walk'}]);near(options.previous.samples[0].time,.6);for(let i=0;i<5;i++)stepAnimator(owner,.1);assert.equal(owner._animatorFrame.previous,null);
});
test('normalized fade duration scales with the source state duration',()=>{
 const owner={animatorGraph:graph()};owner.animatorGraph.states[0].duration=2;Object.assign(owner.animatorGraph.transitions[0],{hasExitTime:false,blend:.5,fixedDuration:false});near(stepAnimator(owner,.1).blend,.1);
});
test('loop exit windows reoccur and typed triggers are consumed only by the selected transition',()=>{
 const owner={animatorGraph:graph()};owner.animatorGraph.states[0].loop=true;owner.animatorGraph.parameters=[{name:'go',type:'trigger',default:false},{name:'round',type:'int',default:0}];owner.animatorGraph.transitions[0].conditions=[{parameter:'go',operator:'trigger'}];for(let i=0;i<6;i++)stepAnimator(owner,.1);assert.equal(owner._animatorFrame.stateId,'a');assert.equal(setAnimatorParameter(owner,'round',.5),false);assert.equal(setAnimatorParameter(owner,'go',1),false);assert.equal(setAnimatorParameter(owner,'missing',Infinity),false);setAnimatorTrigger(owner,'go');for(let i=0;i<8;i++)assert.equal(stepAnimator(owner,.1).stateId,'a');assert.equal(stepAnimator(owner,.1).stateId,'b');assert.equal(owner.animatorParameters.go,false);
});
test('one-shot default attacks finish their state and a repeated manual Play deliberately restarts it',()=>{
 const owner={animatorGraph:defaultAnimatorGraph()};owner._animatorAction={action:'attack',remaining:.05};assert.equal(stepAnimator(owner,.05).stateId,'attack');for(let i=0;i<5;i++)assert.equal(stepAnimator(owner,.05).stateId,'attack');for(let i=0;i<4;i++)stepAnimator(owner,.05);assert.equal(owner._animatorFrame.stateId,'motion');playAnimatorState(owner,'attack',1);stepAnimator(owner,.1);stepAnimator(owner,.1);assert.ok(owner._animatorFrame.time>.1);playAnimatorState(owner,'attack',1);near(stepAnimator(owner,.1).time,.1);
});
test('graph validation safely handles malformed conditions, blends, layers, timing and typed defaults',()=>{
 for(const mutate of [g=>g.transitions[0].conditions=[null],g=>g.transitions[0].exitTime=NaN,g=>g.transitions[0].blend=Infinity,g=>g.states[0].events=[null],g=>g.states[0].blend={},g=>g.states[0].blend=[{clip:'walk',threshold:0},{clip:'idle',threshold:0}],g=>g.layers=[{clip:'idle',weight:2}],g=>g.parameters=[{name:'__proto__',type:'float',default:0}]]){const bad=graph();mutate(bad);assert.ok(inspectAnimatorGraph(bad).length);assert.doesNotThrow(()=>stepAnimator({animatorGraph:bad},.1));}
});
test('a visual-only network guest samples its Animator without moving authored scene objects',()=>{
 const owner=authored();owner.animatorGraph=graph();stepEntityAnimations([owner],.1,{visualOnly:true});assert.equal(owner.x,0);assert.equal(owner._animatorFrame.stateId,'a');
});
test('WarScript and JS shared APIs set typed Animator parameters, triggers and forced states',()=>{
 const owner={x:0,y:0,animatorGraph:graph()};owner.animatorGraph.parameters=[{name:'go',type:'trigger',default:false}];const api=createScriptApi(owner,{globals:{},entities:[owner]},{delta:0,elapsed:0});api.call('Animator.SetTrigger',['go']);assert.equal(owner.animatorParameters.go,true);api.call('Animator.ResetTrigger',['go']);assert.equal(owner.animatorParameters.go,false);assert.throws(()=>api.call('Animator.SetBool',['go',1]),/incompatible/);assert.throws(()=>api.call('Animator.SetFloat',['n',Infinity]),/incompatible/);api.call('Animator.Play',['b']);assert.equal(stepAnimator(owner,.1).stateId,'b');assert.throws(()=>api.call('Animator.Play',['absent']),/absent/);
});

test('an empty clip does not acquire a preview lock',()=>{
 const preview=new AnimationPreview();assert.equal(preview.seek({x:1},createClip(),0),null);assert.equal(preview.owner,null);
});

test('legacy scene import preserves authored clips and Animator settings',async()=>{
 const {state}=await import('../js/core/state.js'),{importScene}=await import('../js/core/scene.js');
 const originalDocument=globalThis.document,backup={...state};const element=()=>({replaceChildren(){},append(){},classList:{toggle(){}}});globalThis.document={querySelector:element,createElement:element,dispatchEvent(){}};
 try{state.playing=false;const actor=authored();actor.animatorGraph=graph();await importScene({text:async()=>JSON.stringify({entities:[actor]})});assert.deepEqual(state.entities[0].animationStudio,actor.animationStudio);assert.deepEqual(state.entities[0].animatorGraph,actor.animatorGraph);}finally{Object.assign(state,backup);globalThis.document=originalDocument}
});
