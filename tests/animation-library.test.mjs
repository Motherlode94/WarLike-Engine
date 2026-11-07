import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {parseGlb} from '../js/assets/real-models-3d.js';
import {animationCategory,sourceAnimationLibrary,editableSourceClip,importSourceAnimations} from '../js/core/animation-library.js';
import {animationProfiles,buildAnimationProfile,applyAnimationProfile} from '../js/core/animation-profiles.js';
import {sampleRigPose} from '../js/core/gltf-animation.js';
import {defaultAnimationRig,compileSkeletalClip,inspectAnimationRig} from '../js/core/skeletal-animation.js';
import {inspectAnimatorGraph,stepAnimator,setAnimatorTrigger,noteAnimatorAction} from '../js/core/animator-graph.js';
import {prepareGameDefinition} from '../js/core/game-build.js';import {freshGameProject} from '../js/core/game-project.js';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-4,`${a} != ${b}`);
const load=path=>{const b=readFileSync(new URL('../'+path,import.meta.url));return parseGlb(b.buffer.slice(b.byteOffset,b.byteOffset+b.length))};
const rigs=[['Kenney',load('assets/free/kenney/mini-characters/character-male-a.glb').rig],['UAL1',load('assets/free/quaternius/universal-animation-library/ual1-standard.glb').rig],['UAL2',load('assets/free/quaternius/universalanimationlibrary2/ual2-standard.glb').rig]];
test('source library exposes every actual model clip, grouped without synthetic animations',()=>{assert.equal(sourceAnimationLibrary(rigs[0][1]).length,32);assert.equal(sourceAnimationLibrary(rigs[1][1]).length,43);for(const [,rig] of rigs)for(const row of sourceAnimationLibrary(rig)){assert.ok(rig.animations.includes(row.clip));assert.ok(row.duration>0);assert.ok(row.category);}assert.equal(animationCategory('Pistol_Reload'),'Combat');assert.equal(animationCategory('Walk_Loop'),'Déplacement');assert.equal(animationCategory('Farm_Harvest'),'Interactions');assert.equal(animationCategory('Dance_Loop'),'Expressions');});
for(const [name,rig] of rigs)for(const profile of animationProfiles)test(name+' · '+profile.name+' binds only real clips with their durations',()=>{const result=buildAnimationProfile(rig.animations,profile.id);assert.ok(result.graph);assert.deepEqual(inspectAnimatorGraph(result.graph),[]);for(const state of result.graph.states){const actual=rig.animations.find(c=>c.name===state.clip);assert.ok(actual,state.clip);near(state.duration,Math.max(.05,actual.duration));for(const point of state.blend||[])assert.ok(rig.animations.some(c=>c.name===point.clip));}assert.ok(result.graph.parameters.every(p=>['trigger','bool'].includes(p.type)));});
test('editable copy preserves actual GLB TRS poses at original and interpolated key times',()=>{const rig=rigs[0][1],source=rig.animations.find(c=>c.name==='walk'),original=structuredClone(rig.nodes),copy=editableSourceClip(rig,source),compiled=compileSkeletalClip(rig,copy);assert.deepEqual(inspectAnimationRig({...defaultAnimationRig(),clips:[copy]}),[]);for(const time of [0,.1,.3,source.duration]){const a=sampleRigPose(rig,source,time,{loop:false}),b=sampleRigPose(rig,compiled,time,{loop:false});for(let i=0;i<a.world.length;i++)for(let j=0;j<16;j++)near(a.world[i][j],b.world[i][j]);}assert.deepEqual(rig.nodes,original);assert.equal(copy.source.clip,'walk');});
test('bulk import is atomic, rejects excess capacity and reopens an existing copy without duplicating',()=>{const rig=rigs[1][1],owner={animationRig:defaultAnimationRig()},before=structuredClone(owner);assert.throws(()=>importSourceAnimations(owner,rig,rig.animations,'ual'),/32/);assert.deepEqual(owner,before);const [first]=importSourceAnimations(owner,rig,[rig.animations[0]],'ual'),[again]=importSourceAnimations(owner,rig,[rig.animations[0]],'ual');assert.equal(first,again);assert.equal(owner.animationRig.clips.length,1);assert.notEqual(first.channels,rig.animations[0].channels);});
test('missing actions stay absent and profiles require a real idle clip',()=>{const result=buildAnimationProfile([{name:'idle',duration:1}],'shooter');assert.deepEqual(result.graph.states.map(s=>s.id),['motion']);assert.ok(result.missing.includes('Recharger'));assert.equal(buildAnimationProfile([{name:'Shoot',duration:1}],'shooter').graph,null);});
test('profile trigger reaches a real attack and returns only after the source clip duration',()=>{const rig=rigs[0][1],owner={x:0,y:0,hp:100};applyAnimationProfile(owner,rig.animations,'melee');stepAnimator(owner,.05);setAnimatorTrigger(owner,'attackRequest');const frame=stepAnimator(owner,.05);assert.equal(frame.stateId,'attack');assert.equal(owner.animatorParameters.attackRequest,false);for(let i=0;i<Math.floor((frame.duration-.06)/.05);i++)assert.equal(stepAnimator(owner,.05).stateId,'attack');for(let i=0;i<3;i++)stepAnimator(owner,.05);assert.equal(owner._animatorFrame.stateId,'motion');});
test('applying a profile replaces parameters and resets an existing graph track',()=>{const owner={};applyAnimationProfile(owner,rigs[0][1].animations,'adventure');stepAnimator(owner,.1);stepAnimator(owner,.1);owner.animatorParameters={oldFlag:true};applyAnimationProfile(owner,rigs[0][1].animations,'interactions');const frame=stepAnimator(owner,.05);near(frame.time,.05);assert.deepEqual(owner.animatorParameters,{});assert.equal(frame.stateId,'motion');});
test('source copies and ready Animator graphs are retained in the exported game',()=>{const rig=rigs[0][1],owner={id:1,type:'player',x:0,y:0,w:32,h:64};const copies=importSourceAnimations(owner,rig,[rig.animations.find(c=>c.name==='walk')],'kenney');applyAnimationProfile(owner,rig.animations,'adventure');const built=prepareGameDefinition({entities:[owner],project:freshGameProject()}).project.scenes[0].entities[0];assert.deepEqual(built.animationRig.clips,copies);assert.deepEqual(built.animatorGraph,owner.animatorGraph);});

test('demo profiles retain exact clip bindings and durations from their bundled source models',async()=>{const {animationDemoProfiles}=await import('../js/assets/animation-demo-profiles.js');assert.deepEqual(animationDemoProfiles.melee,buildAnimationProfile(rigs[1][1].animations,'melee').graph);assert.deepEqual(animationDemoProfiles.interactions,buildAnimationProfile(rigs[0][1].animations,'interactions').graph);});

test('demo contains two interactive animation actors whose Blueprint signals trigger real states',async()=>{
 const {createAnimationDemo}=await import('../js/core/animation-demo.js'),{updateSequences,resetSequences,emitSequenceSignal,sequenceRuntime}=await import('../js/core/logic-sequences.js'),{inspectBlueprintGame}=await import('../js/core/blueprint-validation.js');const demo=createAnimationDemo(),actors=demo.entities.filter(o=>o.hierarchyGroup==='Bibliothèque animée');assert.equal(actors.length,2);assert.deepEqual(inspectBlueprintGame(demo.entities).filter(i=>i.severity==='error'),[]);const player=demo.entities.find(o=>o.playable3d);for(const actor of actors){resetSequences();const binding=actor.sequences[0];emitSequenceSignal(binding.signal);updateSequences(.05,{playing:true,entities:demo.entities,player,mode:'3d',keys:new Set(),pressedKeys:new Set()});const expected=binding.instructions[0].key.replace(/Request$/,'');assert.equal(stepAnimator(actor,.05).stateId,expected);assert.deepEqual(sequenceRuntime.errors,[]);}resetSequences();
});


test('ready profiles keep death stable despite airborne motion, actions and queued triggers',()=>{
 for(const [model,rig] of rigs)for(const profile of animationProfiles){
  const owner={hp:100,x:0,y:0,elevation3d:0,grounded3d:true};applyAnimationProfile(owner,rig.animations,profile.id);
  if(!owner.animatorGraph.states.some(s=>s.id==='death'))continue;
  stepAnimator(owner,.05);owner.hp=0;owner.grounded3d=false;noteAnimatorAction(owner,'attack',1);
  for(const parameter of owner.animatorGraph.parameters)if(parameter.type==='trigger')setAnimatorTrigger(owner,parameter.name);
  const entered=[];for(let i=0;i<30;i++){owner.elevation3d+=i%2?.1:-.1;assert.equal(stepAnimator(owner,.05,{onEvent:e=>entered.push(e.value)}).stateId,'death',model+' '+profile.id);}
  assert.equal(entered.filter(e=>e==='animation:death:enter').length,1);
  owner.hp=100;owner.grounded3d=true;owner.animatorParameters={};assert.equal(stepAnimator(owner,.05).stateId,'motion');
 }
});
test('standard weapon attack drives the shooter profile and returns after its real clip duration',()=>{
 for(const [model,rig] of rigs){const owner={hp:100};applyAnimationProfile(owner,rig.animations,'shooter');stepAnimator(owner,.05);noteAnimatorAction(owner,'attack',.1);
  const frame=stepAnimator(owner,.05);if(!owner.animatorGraph.states.some(s=>s.id==='shoot')){assert.equal(frame.stateId,'motion');assert.ok(buildAnimationProfile(rig.animations,'shooter').missing.includes('Tirer'));continue;}assert.equal(frame.stateId,'shoot',model);assert.ok(rig.animations.some(c=>c.name===frame.clip));
  for(let i=0;i<Math.ceil(frame.duration/.05)+5;i++)stepAnimator(owner,.05);assert.equal(owner._animatorFrame.stateId,'motion');
  setAnimatorTrigger(owner,'shootRequest');assert.equal(stepAnimator(owner,.05).stateId,'shoot');
 }
});
test('demo player and profile actors cannot leave death when an action is requested',async()=>{
 const {createAnimationDemo}=await import('../js/core/animation-demo.js');for(const owner of createAnimationDemo().entities.filter(e=>e.animatorGraph?.states.some(s=>s.id==='death'))){
  if(owner.stats)owner.stats.health=0;owner.hp=0;owner.grounded3d=false;noteAnimatorAction(owner,'attack',1);
  for(const p of owner.animatorGraph.parameters)if(p.type==='trigger')setAnimatorTrigger(owner,p.name);
  for(let i=0;i<12;i++)assert.equal(stepAnimator(owner,.05).stateId,'death',owner.name);
 }
});
