import test from 'node:test';
import assert from 'node:assert/strict';
import {createHumanoidAvatar,inspectHumanoidAvatar,humanoidMaskRoots,retargetHumanoidClip,requiredHumanoidBones} from '../js/core/humanoid-avatar.js';
import {compileSkeletalClip,defaultAnimationRig,sampleEntityRigPose,cacheAnimationGeometry,prepareSkeletalAssets} from '../js/core/skeletal-animation.js';
import {sampleRigPose} from '../js/core/gltf-animation.js';
import {defaultAnimatorGraph} from '../js/core/animator-graph.js';
import {inspectRuntimeCompatibility} from '../js/core/runtime-capabilities.js';
import {canonicalScene,runtimeEntities} from '../js/core/scene-contract.js';
import {prepareGameDefinition} from '../js/core/game-build.js';
const q=z=>[0,0,Math.sin(z/2),Math.cos(z/2)];
function humanoid(scale=1,prefix=''){
 const nodes=[],parents=[];
 const add=(name,parent,t)=>{parents.push(parent);nodes.push({name:prefix+name,translation:t.map(v=>v*scale),rotation:[0,0,0,1],scale:[1,1,1],children:[]});return nodes.length-1};
 const hips=add('Hips',-1,[0,1,0]),spine=add('Spine',hips,[0,.3,0]);add('Head',spine,[0,.5,0]);
 for(const [side,sign] of [['Left',1],['Right',-1]]){
  const arm=add(side+'Arm',spine,[sign*.2,.2,0]),forearm=add(side+'ForeArm',arm,[sign*.3,0,0]);add(side+'Hand',forearm,[sign*.25,0,0]);
  const thigh=add(side+'UpLeg',hips,[sign*.1,0,0]),leg=add(side+'Leg',thigh,[0,-.45,0]);add(side+'Foot',leg,[0,-.45,.1]);
 }
 nodes.forEach((n,i)=>{if(parents[i]>=0)nodes[parents[i]].children.push(i)});
 return {nodes,parents,skins:[],animations:[]};
}
test('semantic Avatar recognizes common exporter prefixes and refuses missing, duplicate or inverted chains',()=>{
 const rig=humanoid(1,'mixamorig:');const avatar=createHumanoidAvatar(rig);
 assert.equal(requiredHumanoidBones.length,15);assert.deepEqual(inspectHumanoidAvatar(avatar,rig),[]);
 const bad=structuredClone(avatar);bad.bones.leftHand=bad.bones.rightHand;
 assert.ok(inspectHumanoidAvatar(bad,rig).some(e=>e.includes('plusieurs')));
 const missing=createHumanoidAvatar(rig,{bones:{leftFoot:''}});assert.ok(inspectHumanoidAvatar(missing,rig).some(e=>e.includes('leftFoot')));
 const malformed=humanoid();malformed.parents[malformed.nodes.findIndex(n=>n.name==='LeftForeArm')]=0;
 assert.ok(inspectHumanoidAvatar(createHumanoidAvatar(malformed),malformed).some(e=>e.includes('hiérarchie')));
});
test('autodetection chooses Spine over Spine1 and leaves duplicate exact names unresolved',()=>{
 const rig=humanoid();rig.nodes.push({...rig.nodes[1],name:'Spine1'});rig.parents.push(1);
 assert.equal(createHumanoidAvatar(rig).bones.spine,'Spine');
 rig.nodes.push({...rig.nodes[1]});rig.parents.push(0);
 assert.equal(createHumanoidAvatar(rig).bones.spine,undefined);
});
test('body part masks identify subtree roots without including the legs in upper body',()=>{
 const avatar=createHumanoidAvatar(humanoid());
 assert.deepEqual(humanoidMaskRoots(avatar,'upperBody'),['Spine']);
 assert.deepEqual(humanoidMaskRoots(avatar,'lowerBody'),['LeftUpLeg','RightUpLeg']);
 assert.equal(humanoidMaskRoots(avatar,'unknown'),null);
 delete avatar.bones.spine;assert.equal(humanoidMaskRoots(avatar,'upperBody'),null);
});
test('rest-world transfer respects different parent orientations, target lengths and scaled hip motion',()=>{
 const source=humanoid(),target=humanoid(2,'mixamorig:');
 target.nodes[1].rotation=q(Math.PI/4);
 const arm=source.nodes.findIndex(n=>n.name==='LeftArm');
 const clip={name:'Gesture',duration:1,channels:[{node:arm,path:'rotation',times:[0,1],values:[0,0,0,1,...q(Math.PI/2)],components:4,interpolation:'LINEAR'},
 {node:0,path:'translation',times:[0,1],values:[0,1,0,1,1,0],components:3,interpolation:'LINEAR'}]};
 const beforeSource=structuredClone(source),beforeTarget=structuredClone(target);
 const transferred=retargetHumanoidClip(source,target,clip,createHumanoidAvatar(source),createHumanoidAvatar(target));
 const pose=sampleRigPose(target,compileSkeletalClip(target,transferred),1,{loop:false}),rest=sampleRigPose(target,null,0);
 assert.ok(Math.abs(pose.nodes[0].translation[0]-2)<1e-6,'hip motion scales with leg length');
 assert.equal(pose.nodes[0].translation[1],2);
 const targetArm=target.nodes.findIndex(n=>n.name==='mixamorig:LeftArm');
 // Animated world orientation is rest world orientation plus source's 90° delta.
 assert.ok(Math.abs(pose.world[targetArm][0]-Math.cos(3*Math.PI/4))<1e-6);
 for(const slot of ['LeftForeArm','LeftHand','LeftLeg','LeftFoot']){
  const index=target.nodes.findIndex(n=>n.name==='mixamorig:'+slot);
  assert.deepEqual(pose.nodes[index].translation,target.nodes[index].translation,'target lengths remain authored');
 }
 const atZero=sampleRigPose(target,compileSkeletalClip(target,transferred),0,{loop:false});
 for(let i=0;i<target.nodes.length;i++)assert.ok(Math.abs(atZero.world[i][0]-rest.world[i][0])<1e-6);
 assert.deepEqual(source,beforeSource);assert.deepEqual(target,beforeTarget);
});
test('unsupported transfer budgets and singular/mirrored scales fail explicitly',()=>{
 const source=humanoid(),target=humanoid(),clip={name:'A',duration:30,channels:[]};
 assert.throws(()=>retargetHumanoidClip(source,target,clip,createHumanoidAvatar(source),createHumanoidAvatar(target)),/budget/);
 clip.duration=1;target.nodes[1].scale=[-1,1,1];
 assert.throws(()=>retargetHumanoidClip(source,target,clip,createHumanoidAvatar(source),createHumanoidAvatar(target)),/échelles/);
});
test('semantic upper-body layer affects the arm but preserves the walking leg, and invalid masks never become full body',()=>{
 const rig=humanoid(),arm=rig.nodes.findIndex(n=>n.name==='LeftArm'),leg=rig.nodes.findIndex(n=>n.name==='LeftLeg');
 const clip={name:'Action',duration:1,channels:[arm,leg].map(node=>({node,path:'rotation',times:[0,1],values:[0,0,0,1,...q(Math.PI/2)],components:4,interpolation:'LINEAR'}))};
 const owner={animationRig:{...defaultAnimationRig(),avatar:createHumanoidAvatar(rig)}};
 const pose=sampleEntityRigPose(owner,{rig},{layers:[{clip,time:1,loop:false,weight:1,avatarMask:'upperBody'}]});
 assert.ok(Math.abs(pose.nodes[arm].rotation[2]-Math.SQRT1_2)<1e-6);assert.deepEqual(pose.nodes[leg].rotation,[0,0,0,1]);
 const invalid=sampleEntityRigPose(owner,{rig},{layers:[{clip,time:1,loop:false,weight:1,avatarMask:'bad'}]});
 assert.deepEqual(invalid.nodes[arm].rotation,[0,0,0,1]);assert.deepEqual(invalid.nodes[leg].rotation,[0,0,0,1]);
});
test('Avatar and layer masks survive canonical and exported scenes; Play refuses a missing target bone',async()=>{
 const rig=humanoid(),owner={id:1,name:'Humanoid',assetId:'primitive-cube',type:'mesh3d',x:0,y:0,w:64,h:128,depth3d:32,color:'#ffffff',playable3d:true,
  animationRig:{...defaultAnimationRig(),avatar:createHumanoidAvatar(rig)},animatorGraph:defaultAnimatorGraph()};
 owner.animatorGraph.layers=[{clip:'attack',weight:1,avatarMask:'upperBody'}];
 assert.deepEqual(inspectRuntimeCompatibility([owner]),[]);
 const roundtrip=runtimeEntities(canonicalScene([owner]));assert.deepEqual(roundtrip[0].animationRig.avatar,owner.animationRig.avatar);
 const exported=prepareGameDefinition({entities:[owner],mode:'3d'});assert.equal(exported.project.scenes[0].entities[0].animatorGraph.layers[0].avatarMask,'upperBody');
 cacheAnimationGeometry('primitive-cube',{rig});await prepareSkeletalAssets([owner]);
 const before=structuredClone(owner);owner.animationRig.avatar.bones.leftHand='Missing';await assert.rejects(()=>prepareSkeletalAssets([owner]),/absent/);
 owner.animationRig=before.animationRig;owner.animationRig.avatar.enabled=false;
 assert.ok(inspectRuntimeCompatibility([owner]).some(e=>e.message.includes('Avatar actif')));
});
