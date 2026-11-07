import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {registerLocalModel,importedModels3d,parseGlb} from '../js/assets/real-models-3d.js';
import {encodeProjectAssets,restoreProjectAssets} from '../js/core/portable-assets.js';
import {exportGamePackage} from '../js/core/game-build.js';
import {freshGameProject} from '../js/core/game-project.js';
import {sampleRigPose,normalMatrix3,transformNormal} from '../js/core/gltf-animation.js';
import {stepAnimator,animatorPoseOptions,inspectAnimatorGraph} from '../js/core/animator-graph.js';
const root=new URL('../',import.meta.url);
const fixture=async()=>new File([await readFile(new URL('assets/free/kenney/mini-characters/character-male-a.glb',root))],'character.glb');
function unzip(bytes){
 const files=new Map(),view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),decoder=new TextDecoder();let offset=0;
 while(view.getUint32(offset,true)===0x04034b50){const size=view.getUint32(offset+18,true),length=view.getUint16(offset+26,true),extra=view.getUint16(offset+28,true),start=offset+30+length+extra;files.set(decoder.decode(bytes.subarray(offset+30,offset+30+length)),bytes.slice(start,start+size));offset=start+size}
 return files;
}
test('scene assets travel to a fresh catalogue and invalid imports are atomic',async()=>{
 const model=registerLocalModel(await fixture()),payload={entities:[{model3dId:model.id}]};
 try{
  const assets=await encodeProjectAssets(payload);assert.equal(assets.length,1);importedModels3d.delete(model.id);
  let written=0;await restoreProjectAssets(assets,{persist:async models=>{written=models.length}});
  assert.equal(written,1);assert.deepEqual(new Uint8Array(await importedModels3d.get(model.id).file.arrayBuffer()),new Uint8Array(await model.file.arrayBuffer()));
  let called=false;await assert.rejects(restoreProjectAssets([...assets,{...assets[0],id:'local-invalid',data:btoa('invalid')}],{persist:async()=>{called=true}}));assert.equal(called,false);
 }finally{importedModels3d.delete(model.id)}
});
test('ZIP includes the original imported GLB and a bootable catalogue with no blob URL',async()=>{
 const model=registerLocalModel(await fixture());
 try{
  const entity={id:1,name:'Player',playable3d:true,type:'mesh3d',assetId:model.id,model3dId:model.id,x:0,y:0,w:32,h:64};
  const files=['index.html','js/assets/imported-models-3d.js'];
  const result=await exportGamePackage({entities:[entity],mode:'3d',project:freshGameProject()},{fetcher:async url=>url.pathname.endsWith('runtime-files.json')?Response.json({files}):new Response(await readFile(new URL(url.pathname.split('/WarLike-Engine/')[1],root)))});
  const entries=unzip(new Uint8Array(await result.blob.arrayBuffer())),decode=path=>new TextDecoder().decode(entries.get(path));
  const path='assets/imported/'+model.id+'.glb';assert.ok(entries.has(path));assert.equal(parseGlb(entries.get(path).buffer).rig.animations.length,32);
  assert.match(decode('js/assets/imported-models-3d.js'),new RegExp(model.id));assert.ok(!decode('js/assets/imported-models-3d.js').includes('blob:'));assert.match(decode('index.html'),/game-build-player/);
 }finally{importedModels3d.delete(model.id)}
});
test('normal inverse transpose respects nonuniform and reflected scales',()=>{
 const m=[2,0,0,0,0,1,0,0,0,0,.5,0,0,0,0,1];assert.deepEqual(transformNormal(normalMatrix3(m),1,1,1),[.5,1,2]);m[0]=-2;assert.deepEqual(transformNormal(normalMatrix3(m),1,1,1),[-.5,1,2]);
});
test('material defaults and optional primitive extensions preserve real GLB surfaces',()=>{
 const json={asset:{version:'2.0'},nodes:[{mesh:0,children:[1]},{translation:[0,1,0]}],meshes:[{primitives:[{attributes:{POSITION:0},material:0,extensions:{KHR_materials_variants:{mappings:[]}}}]}],materials:[{}],accessors:[{bufferView:0,componentType:5126,count:3,type:'VEC3'}],bufferViews:[{buffer:0,byteLength:36}]};
 const encoded=new TextEncoder().encode(JSON.stringify(json)),length=Math.ceil(encoded.length/4)*4,bytes=new ArrayBuffer(28+length+36),view=new DataView(bytes);
 [0x46546c67,2,bytes.byteLength,length,0x4e4f534a].forEach((value,i)=>view.setUint32(i*4,value,true));new Uint8Array(bytes,20,length).fill(32);new Uint8Array(bytes,20,encoded.length).set(encoded);view.setUint32(20+length,36,true);view.setUint32(24+length,0x004e4942,true);[0,0,0,1,0,0,0,1,0].forEach((v,i)=>view.setFloat32(28+length+i*4,v,true));
 const geometry=parseGlb(bytes);assert.equal(geometry.triangleCount,1);assert.equal(geometry.parts[0].metallic,1);assert.equal(geometry.parts[0].roughness,1);
});
test('additive masked layers preserve locomotion and use an independent clock',()=>{
 const rest=name=>({name,translation:[0,0,0],rotation:[0,0,0,1],scale:[1,1,1]});
 const channel=(node,path,values)=>({node,path,times:[0,1],values,components:3});
 const base={name:'walk',duration:1,channels:[channel(0,'translation',[0,0,0,2,0,0])]},upper={name:'recoil',duration:1,channels:[channel(1,'translation',[0,0,0,0,2,0])]};
 const rig={nodes:[rest('root'),rest('spine')],parents:[-1,0],skins:[],animations:[base,upper]};
 const pose=sampleRigPose(rig,base,.5,{layers:[{clip:upper,time:.5,weight:.5,mode:'additive',bones:['spine']}]});assert.deepEqual(pose.nodes[0].translation,[1,0,0]);assert.deepEqual(pose.nodes[1].translation,[0,.5,0]);
 const graph={entry:'a',states:[{id:'a',clip:'walk',duration:1},{id:'b',clip:'walk',duration:1}],transitions:[{from:'a',to:'b',conditions:[],blend:0}],layers:[{clip:'recoil',mode:'additive',weight:.5,speed:2,offset:.25}],parameters:[]},owner={x:0,y:0,animatorGraph:graph};
 assert.deepEqual(inspectAnimatorGraph(graph),[]);const frame=stepAnimator(owner,.1);assert.equal(animatorPoseOptions(frame,rig.animations).layers[0].time,.45);
 graph.layers[0].mode='invalid';assert.ok(inspectAnimatorGraph(graph).length);
});
