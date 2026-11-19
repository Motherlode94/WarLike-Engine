import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {parseGlb} from '../js/assets/real-models-3d.js';
import {sampleRigPose,deformGlbParts,resolveAnimationClip} from '../js/core/gltf-animation.js';
import {compileSkeletalClip,sampleEntityRigPose} from '../js/core/skeletal-animation.js';
import {createHumanoidAvatar,inspectHumanoidAvatar,retargetHumanoidClip} from '../js/core/humanoid-avatar.js';
import {createProductionValidationScene} from '../js/core/production-validation-scene.js';
import {stepAnimator,animatorPoseOptions} from '../js/core/animator-graph.js';
async function load(path){const b=await readFile(new URL('../'+path,import.meta.url));return parseGlb(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength))}
test('the bundled UAL humanoid maps, retargets a genuine walk and deforms actual skinned vertices',async()=>{
 const g=await load('assets/free/quaternius/universal-animation-library/ual1-standard.glb'),before=structuredClone(g.rig.nodes),avatar=createHumanoidAvatar(g.rig);
 assert.deepEqual(inspectHumanoidAvatar(avatar,g.rig),[]);assert.equal(avatar.bones.spine,'spine_01');assert.equal(avatar.bones.chest,'spine_02');assert.equal(avatar.bones.upperChest,'spine_03');
 const original=resolveAnimationClip(g.rig.animations,'walk');assert.ok(original);
 const clip=compileSkeletalClip(g.rig,retargetHumanoidClip(g.rig,g.rig,original,avatar,avatar));
 const a=deformGlbParts(g,sampleRigPose(g.rig,clip,0)),b=deformGlbParts(g,sampleRigPose(g.rig,clip,.3));
 assert.ok(b.every(part=>part.every(Number.isFinite)));assert.ok(a.some((part,i)=>part.some((v,k)=>Math.abs(v-b[i][k])>.005)));
 assert.deepEqual(g.rig.nodes,before);
});
test('the six-bone Kenney mini rig is explicitly rejected as a full humanoid Avatar',async()=>{
 const g=await load('assets/free/kenney/mini-characters/character-male-a.glb'),avatar=createHumanoidAvatar(g.rig),errors=inspectHumanoidAvatar(avatar,g.rig);
 assert.ok(errors.some(e=>e.includes('leftLowerArm')));assert.ok(errors.some(e=>e.includes('leftFoot')));
 assert.throws(()=>retargetHumanoidClip(g.rig,g.rig,g.rig.animations[0],avatar,avatar),/manquante/);
});
test('the native production lab really combines UAL walking legs with a talking upper body',async()=>{
 const g=await load('assets/free/quaternius/universal-animation-library/ual1-standard.glb');
 const avatar=createProductionValidationScene().entities.find(o=>o.animationRig?.avatar);
 for(let i=0;i<3;i++)stepAnimator(avatar,.1,{mode:'3d'});
 const frame=avatar._animatorFrame,pose=sampleEntityRigPose(avatar,g,animatorPoseOptions(frame,g.rig.animations));
 const walk=g.rig.animations.find(c=>c.name==='Walk_Formal_Loop'),talk=g.rig.animations.find(c=>c.name==='Idle_Talking_Loop');
 assert.ok(Math.abs(avatar.animatorGraph.states[0].duration-walk.duration)<1e-5);
 const legs=sampleRigPose(g.rig,walk,frame.time),upper=sampleRigPose(g.rig,talk,frame.layerTime);
 for(const [name,expected] of [['calf_l',legs],['upperarm_l',upper]]){
  const index=g.rig.nodes.findIndex(n=>n.name===name);assert.ok(index>=0);
  pose.nodes[index].rotation.forEach((v,i)=>assert.ok(Math.abs(v-expected.nodes[index].rotation[i])<1e-6,name));
 }
});
