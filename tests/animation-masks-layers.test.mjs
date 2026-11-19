import test from 'node:test';import assert from 'node:assert/strict';
import {defaultTransformMask,resolveTransformMask,inspectTransformMask} from '../js/core/animation-mask.js';
import {sampleRigPose} from '../js/core/gltf-animation.js';
import {inspectAnimatorGraph,stepAnimator,animatorPoseOptions} from '../js/core/animator-graph.js';
import {renameSkeletalClip,skeletalClipReferences} from '../js/core/skeletal-authoring.js';
const rig={nodes:['hips','spine','arm','hand','leg'].map(name=>({name,translation:[0,0,0],rotation:[0,0,0,1],scale:[1,1,1]})),parents:[-1,0,1,2,0],skins:[]};
const clip=(name,value,duration=2)=>({name,duration,channels:rig.nodes.map((_,node)=>({node,path:'translation',times:[0,duration],values:[0,0,0,value,0,0],components:3,interpolation:'LINEAR'}))});
const graph=()=>({enabled:true,entry:'walk',states:[{id:'walk',name:'Walk',clip:'walk',duration:2}],transitions:[],layers:[],parameters:[]});
test('nearest transform rule takes priority regardless of order, supports fractional weights and exclusions',()=>{
 const mask={...defaultTransformMask(),defaultWeight:0,transforms:[{bone:'hand',weight:0},{bone:'spine',weight:.5}]};
 assert.deepEqual(resolveTransformMask(mask,rig),[0,.5,.5,0,0]);mask.transforms.reverse();assert.deepEqual(resolveTransformMask(mask,rig),[0,.5,.5,0,0]);
 const pose=sampleRigPose(rig,null,0,{layers:[{clip:clip('wave',2),weight:1,time:2,loop:false,transformMask:mask}]});assert.deepEqual(pose.nodes.map(n=>n.translation[0]),[0,1,1,0,0]);
});
test('nonrecursive mask rule changes exactly one transform and invalid masks fail closed',()=>{
 const mask={...defaultTransformMask(),transforms:[{bone:'spine',weight:0,recursive:false}]};assert.deepEqual(resolveTransformMask(mask,rig),[1,0,1,1,1]);
 assert.throws(()=>resolveTransformMask({...mask,transforms:[{bone:'missing',weight:0}]},rig),/absent/);assert.ok(inspectTransformMask({...mask,transforms:[{bone:'arm',weight:2}]}).length);
});
test('additive uses sampled reference pose rather than always adding bind displacement',()=>{
 const pose=sampleRigPose(rig,clip('base',10),2,{loop:false,layers:[{clip:clip('add',6),referenceClip:clip('ref',2),referenceTime:2,weight:.5,time:2,loop:false,mode:'additive'}]});
 assert.equal(pose.nodes[0].translation[0],12);assert.equal(rig.nodes[0].translation[0],0);
});
test('shared mask resources, phase synchronization, weight parameters and reference time survive graph JSON',()=>{
 const g=graph();g.parameters=[{name:'aim',type:'float',default:.4}];g.masks=[{id:'hands',name:'Arms',mask:{...defaultTransformMask(),defaultWeight:0,transforms:[{bone:'arm',weight:1}]}}];g.layers=[{clip:'wave',weight:.5,weightParameter:'aim',syncPhase:true,maskId:'hands',referenceClip:'reference',referenceTime:.5}];assert.deepEqual(inspectAnimatorGraph(g),[]);
 const owner={id:1,x:0,y:0,animatorGraph:JSON.parse(JSON.stringify(g))},frame=stepAnimator(owner,.1),options=animatorPoseOptions(frame,[clip('walk',1),clip('wave',2,4),clip('reference',2,6)]);
 assert.ok(Math.abs(options.layers[0].time-.2)<1e-10);assert.equal(options.layers[0].weight,.2);assert.equal(options.layers[0].referenceTime,3);assert.equal(options.layers[0].transformMask.defaultWeight,0);
 g.layers[0].maskId='missing';assert.ok(inspectAnimatorGraph(g).some(e=>/masque absente/.test(e)));
});
test('renaming and deletion guards include additive reference clips',()=>{
 const c={name:'reference'},o={animationRig:{clips:[c]},animatorGraph:{layers:[{clip:'wave',referenceClip:'reference'}]}};assert.equal(skeletalClipReferences(o,'reference').length,1);renameSkeletalClip(o,c,'aim pose');assert.equal(o.animatorGraph.layers[0].referenceClip,'aim pose');
});
