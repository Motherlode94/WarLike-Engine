import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {parseGlb,importedModels3d} from '../js/assets/real-models-3d.js';
import {listRealGlbAnimationClips,retargetImportedHumanoidClip} from '../js/core/humanoid-glb-transfer.js';
import {compileSkeletalClip,sampleEntityRigPose,prepareSkeletalAssets,skeletalClips} from '../js/core/skeletal-animation.js';
import {sampleRigPose,deformGlbParts} from '../js/core/gltf-animation.js';
import {canonicalScene,runtimeEntities} from '../js/core/scene-contract.js';
import {prepareGameDefinition} from '../js/core/game-build.js';
import {defaultAnimatorGraph,stepAnimator,animatorPoseOptions} from '../js/core/animator-graph.js';
const id='local-ual-real-rig-test';
async function installRealRig(){
 const file=await readFile(new URL('../assets/free/quaternius/universal-animation-library/ual1-standard.glb',import.meta.url));
 const buffer=file.buffer.slice(file.byteOffset,file.byteOffset+file.byteLength);
 const geometry=parseGlb(buffer);
 importedModels3d.set(id,{id,name:'UAL Standard real GLB',shape:'glb',file:new File([buffer],'ual1-standard.glb',{type:'model/gltf-binary'})});
 return geometry;
}
test('real GLB humanoid animation retarget survives scene serialization and Web game export',async()=>{
 const rig=await installRealRig();
 try{
  const source=await listRealGlbAnimationClips(id);
  const realWalk=source.find(c=>c.name==='Walk_Formal_Loop');
  assert(realWalk?.duration>0);
  const owner={id:1,name:'Mon personnage GLB',type:'mesh3d',model3dId:id,
   x:0,y:0,w:64,h:128,depth3d:64,elevation3d:0,playable3d:true,
   animatorGraph:defaultAnimatorGraph()};
  const graphBefore=structuredClone(owner.animatorGraph);
  const transferred=await retargetImportedHumanoidClip(owner,{
   sourceModelId:id,sourceClipName:realWalk.name,name:'Marche importée',fps:20
  });
  assert(transferred.channels>=15);
  assert.deepEqual(owner.animatorGraph,graphBefore,'Authored Animator Graph must not be silently replaced');
  assert.deepEqual((await prepareSkeletalAssets([owner])),undefined);
  const compiled=compileSkeletalClip(rig.rig,owner.animationRig.clips[0]);
  const p0=deformGlbParts(rig,sampleRigPose(rig.rig,compiled,0));
  const p1=deformGlbParts(rig,sampleRigPose(rig.rig,compiled,.27));
  assert(p0.some((part,i)=>part.some((x,j)=>Math.abs(x-p1[i][j])>.005)),'Real deformed GLB vertices must move');
  assert.deepEqual(runtimeEntities(canonicalScene([owner]))[0].animationRig,owner.animationRig);
  const exported=prepareGameDefinition({entities:[owner],mode:'3d'});
  const saved=exported.project.scenes.find(s=>s.id===exported.project.activeSceneId).entities[0];
  assert.deepEqual(saved.animationRig,owner.animationRig);
  assert.deepEqual(saved.animatorGraph,graphBefore);
  // Runtime Play retrieves the actual compiled target clip when a state requests it.
  owner.animatorGraph.states[0].clip='Marche importée';
  owner.animatorGraph.states[0].blend=null;
  for(let i=0;i<3;i++)stepAnimator(owner,.1,{mode:'3d'});
  const options=animatorPoseOptions(owner._animatorFrame,rig.rig.animations);
  const pose=sampleEntityRigPose(owner,rig,options);
  assert(pose.nodes.every(n=>n.rotation.every(Number.isFinite)));
  assert(skeletalClips(owner,rig.rig).some(c=>c.name==='Marche importée'));
 }finally{importedModels3d.delete(id)}
});
test('incomplete real Kenney rig refuses humanoid transfer without mutating an authored scene',async()=>{
 const file=await readFile(new URL('../assets/free/kenney/mini-characters/character-male-a.glb',import.meta.url));
 const buffer=file.buffer.slice(file.byteOffset,file.byteOffset+file.byteLength);
 const kenney='local-kenney-real-rig-test';
 importedModels3d.set(kenney,{id:kenney,name:'Kenney mini',shape:'glb',file:new File([buffer],'character-male-a.glb',{type:'model/gltf-binary'})});
 await installRealRig();
 try{
  const owner={id:1,name:'Kenney',model3dId:kenney,animationRig:{enabled:true,clips:[],activeClip:''}};
  const before=structuredClone(owner);
  await assert.rejects(()=>retargetImportedHumanoidClip(owner,{
    sourceModelId:id,sourceClipName:'Walk_Formal_Loop'
  }),/Transfert humanoïde impossible/);
  assert.deepEqual(owner,before);
 }finally{importedModels3d.delete(id);importedModels3d.delete(kenney)}
});
test('existing retargeted animation is never overwritten without explicit approval',async()=>{
 await installRealRig();
 try{
  const o={id:1,name:'Actor',model3dId:id};
  await retargetImportedHumanoidClip(o,{sourceModelId:id,sourceClipName:'Walk_Formal_Loop',name:'Walk'});
  const before=structuredClone(o);
  await assert.rejects(()=>retargetImportedHumanoidClip(o,{sourceModelId:id,sourceClipName:'Walk_Formal_Loop',name:'Walk'}),/remplacement explicite/);
  assert.deepEqual(o,before);
 }finally{importedModels3d.delete(id)}
});
