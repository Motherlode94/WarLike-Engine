import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultAnimatorGraph,inspectAnimatorGraph,animatorBlendSamples,stepAnimator,noteAnimatorAction,playAnimatorState,setAnimatorParameter,animatorPoseOptions,resetAnimators} from '../js/core/animator-graph.js';
import {sampleRigPose} from '../js/core/gltf-animation.js';
import {defaultFxEmitter,emitFx,tickFxRuntime,resetFxRuntime,fxRuntime,sampleFxCurve,mixFxColor,setFxQuality} from '../js/core/fx-runtime.js';
import {sequenceInstructions,sequenceConditions,resetSequences,updateSequences,sequenceRuntime} from '../js/core/logic-sequences.js';
import {instructionLabels,conditionLabels,actionFields} from '../js/core/blueprint-catalog.js';
const actor=()=>({id:1,type:'mesh3d',x:0,y:0,w:32,h:96,depth3d:32,elevation3d:0,grounded3d:true,stats:{health:100},animatorGraph:defaultAnimatorGraph()});
test('Animator locomotion uses real movement and true continuous blend weights',()=>{
 resetAnimators();const o=actor();stepAnimator(o,.05);o.x+=4.2*64*.05;const frame=stepAnimator(o,.05);assert.equal(frame.stateId,'motion');assert.ok(Math.abs(frame.parameters.speed-4.2)<.00001);const mix=animatorBlendSamples(o.animatorGraph.states[0],{speed:5.6});assert.equal(mix.length,2);assert.ok(Math.abs(mix[0].weight-.5)<.00001);assert.equal(mix[1].clip,'run');
});
test('Animator transitions cover powers, flight, jump, fall, death and forced states',()=>{
 const o=actor();stepAnimator(o,.05);noteAnimatorAction(o,'nova',.1);assert.equal(stepAnimator(o,.05).stateId,'cast');stepAnimator(o,.05);o.heroState={flight:true};assert.equal(stepAnimator(o,.05).stateId,'flight');o.heroState.flight=false;o.grounded3d=false;o.elevation3d=.2;assert.equal(stepAnimator(o,.05).stateId,'jump');o.elevation3d=.1;assert.equal(stepAnimator(o,.05).stateId,'fall');assert.equal(playAnimatorState(o,'attack',.5),true);assert.equal(stepAnimator(o,.05).stateId,'attack');o.stats.health=0;assert.equal(stepAnimator(o,.05).stateId,'death');assert.equal(playAnimatorState(o,'missing'),false);
});
test('Animator events fire at normalized times once, and loops repeat deliberately',()=>{
 const o=actor(),events=[];o.animatorGraph.states[0].events=[{time:.25,type:'fx',value:'energy'}];for(let i=0;i<10;i++)stepAnimator(o,.05,{onEvent:e=>events.push(e)});assert.equal(events.filter(e=>e.type==='fx').length,1);for(let i=0;i<20;i++)stepAnimator(o,.05,{onEvent:e=>events.push(e)});assert.equal(events.filter(e=>e.type==='fx').length,2);
});
test('Animator validation and parameters reject malformed topology and prototype names',()=>{
 const o=actor();assert.deepEqual(inspectAnimatorGraph(o.animatorGraph),[]);o.animatorGraph.transitions[0].to='absent';assert.ok(inspectAnimatorGraph(o.animatorGraph).length);assert.equal(stepAnimator(o,.05),null);assert.equal(setAnimatorParameter(o,'constructor',2),false);assert.equal(setAnimatorParameter(o,'weaponReady',true),true);assert.equal(o.animatorParameters.weaponReady,true);
});

test('Animator handles loop-end events and forced states with no matching transition',()=>{
 const o=actor(),events=[];o.animatorGraph.states[0].events=[{time:1,type:'signal',value:'loop:end'}];
 for(let i=0;i<21;i++)stepAnimator(o,.1,{onEvent:e=>events.push(e)});assert.equal(events.filter(e=>e.value==='loop:end').length,2);
 o.animatorGraph.transitions=[];playAnimatorState(o,'attack',.5);assert.equal(stepAnimator(o,.05).stateId,'attack');
});
const node=name=>({name,translation:[0,0,0],rotation:[0,0,0,1],scale:[1,1,1]});
const clip=(name,target,value)=>({name,duration:1,channels:[{node:target,path:'translation',times:new Float32Array([0,1]),values:new Float32Array([...value,...value]),components:3,interpolation:'LINEAR'}]});
test('skeletal sampling blends original clips and isolates upper-body layers by bone descendants',()=>{
 const rig={nodes:[node('Root'),node('Spine'),node('Arm')],parents:new Int32Array([-1,0,1]),skins:[]},a=clip('Idle',0,[0,0,0]),b=clip('Walk',0,[10,0,0]),upper=clip('Attack',1,[0,6,0]);
 const pose=sampleRigPose(rig,null,0,{samples:[{clip:a,time:0,weight:.5},{clip:b,time:0,weight:.5}],layers:[{clip:upper,time:0,weight:.5,bones:['Spine']}]});assert.equal(pose.world[0][12],5);assert.equal(pose.world[0][13],0);assert.equal(pose.world[1][13],3);assert.equal(pose.world[2][13],3);
 const o=actor(),frame=stepAnimator(o,.05),options=animatorPoseOptions(frame,[{...a,name:'idle'},{...b,name:'walk'}]);assert.ok(options.samples.every(s=>s.clip));
});
test('FX curves interpolate deterministically without mutating their points',()=>{
 const points=[{time:1,value:0},{time:0,value:2}],before=structuredClone(points);assert.equal(sampleFxCurve(points,.25),1.5);assert.equal(sampleFxCurve([],0,.4),.4);assert.deepEqual(points,before);assert.equal(mixFxColor('#000000','#ffffff',.5),'#808080');
});
test('FX use lifetime size/color/alpha, bounded trails and directional emission',()=>{
 resetFxRuntime();const cfg={...defaultFxEmitter(),kind:'energy',shape:'cone',direction:0,spread:0,speed:100,lifetime:2,trail:true,color:'#ff0000',endColor:'#0000ff',count:3};emitFx('energy',{x:0,y:0,z:0},{...cfg,mode:'2d'});assert.ok(fxRuntime.particles.every(p=>p.vx>0&&p.vy===0));for(let i=0;i<12;i++)tickFxRuntime([],1/60);assert.ok(fxRuntime.particles.every(p=>p.trail.length<=10&&p.renderColor!==p.color&&p.renderAlpha<1&&p.renderSize>=0));
 setFxQuality('low');emitFx('energy',{x:0,y:0,z:0},{count:10000});assert.ok(fxRuntime.particles.length<=280);setFxQuality('standard');resetFxRuntime();
});
test('FX collisions remove particles on a swept wall crossing, with owner exclusion',()=>{
 resetFxRuntime();emitFx('energy',{x:0,y:0,z:32},{mode:'3d',shape:'cone',direction:0,spread:0,speed:10000,lifetime:2,count:1,collision:true,ownerId:1});const owner={id:1,type:'mesh3d',x:-10,y:-10,w:30,h:64,depth3d:30},wall={id:2,type:'mesh3d',x:50,y:-200,w:1,h:200,depth3d:400};tickFxRuntime([owner,wall],.1,'3d');assert.equal(fxRuntime.particles.length,0);resetFxRuntime();
});
test('Blueprint exposes and executes Animator parameters, states and authored FX',()=>{
 for(const opcode of ['playAnimatorState','setAnimatorParameter','emitOwnedFx']){assert.ok(sequenceInstructions.includes(opcode));assert.ok(instructionLabels[opcode]);assert.ok(actionFields(opcode).length)}assert.ok(sequenceConditions.includes('animatorStateIs'));assert.ok(conditionLabels.animatorStateIs);
 const o=actor();o.fxEmitter=defaultFxEmitter();o.sequence={enabled:true,event:'start',once:true,instructions:[{type:'setAnimatorParameter',key:'alert',value:'true',valueType:'boolean'},{type:'playAnimatorState',value:'attack',duration:.5},{type:'emitOwnedFx',value:5}]};resetSequences();resetFxRuntime();updateSequences(.05,{playing:true,entities:[o],player:o,mode:'3d',keys:new Set()});assert.equal(o.animatorParameters.alert,true);assert.equal(stepAnimator(o,.05).stateId,'attack');assert.equal(fxRuntime.particles.length,5);assert.equal(sequenceRuntime.errors.length,0);resetFxRuntime();
});

test('top-down 2D locomotion stays grounded even when the collision resolver has no floor',()=>{
 const o=actor();o.controller2d={mode:'topDown'};o.grounded2d=false;stepAnimator(o,.05,{mode:'2d'});o.x+=10;assert.equal(stepAnimator(o,.05,{mode:'2d'}).stateId,'motion');
});
test('an unmasked animation layer blends the whole skeleton',()=>{
 const rig={nodes:[node('Root')],parents:new Int32Array([-1]),skins:[]},base=clip('Idle',0,[0,0,0]),full=clip('Wave',0,[0,4,0]);const pose=sampleRigPose(rig,base,0,{layers:[{clip:full,time:0,weight:.5,bones:[]}]});assert.equal(pose.world[0][13],2);
});
