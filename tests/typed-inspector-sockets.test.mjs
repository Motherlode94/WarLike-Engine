import test from 'node:test';
import assert from 'node:assert/strict';
import {validateEditorProperty} from '../js/core/component-definitions.js';
import {boneSocketPoint3d,composeTransformMatrix,multiplyMatrix4} from '../js/core/scene-graph-v2.js';
import {canonicalScene,runtimeEntities} from '../js/core/scene-contract.js';
test('metadata-driven Inspector validates typed values, bounds and enums',()=>{
 assert.equal(validateEditorProperty({type:'number',min:0,max:10},3),3);
 assert.throws(()=>validateEditorProperty({type:'number',min:0,max:10},11),/limites/);
 assert.deepEqual(validateEditorProperty({type:'vector3'},{x:'1',y:2,z:3}),{x:1,y:2,z:3});
 assert.equal(validateEditorProperty({type:'color'},'#FFAA20'),'#ffaa20');
 assert.throws(()=>validateEditorProperty({type:'color'},'red'),/hexadécimale/);
 assert.equal(validateEditorProperty({type:'enum',options:['Spot','Point']},'Spot'),'Spot');
 assert.throws(()=>validateEditorProperty({type:'enum',options:['Spot','Point']},'Directional'),/invalide/);
});
test('Bone Socket resolves animated joint positions with GLB normalization',()=>{
 const parent={},bone=composeTransformMatrix([2,4,6],[0,0,0],[1,1,1]);
 const geometry={normalizationCenter:[1,1,1],normalizationScale:2,normalizedSize:[1,1,1]};
 const box={x:10,y:2,z:-2,w:2,h:2,d:2},q={x:0,y:0,z:0,w:1};
 assert.deepEqual(boneSocketPoint3d(parent,bone,geometry,box,q),[11,5,3]);
 assert.deepEqual(boneSocketPoint3d(parent,bone,geometry,box,q,[.5,0,0]),[11.5,5,3]);
});
test('Bone Socket responds to affine parent transforms',()=>{
 const parent={worldMatrix3d:composeTransformMatrix([3,0,0],[0,0,0],[1,1,1]),matrixReference3d:composeTransformMatrix([0,0,0],[0,0,0],[1,1,1])};
 const bone=composeTransformMatrix([0,0,0],[0,0,0],[1,1,1]);
 const p=boneSocketPoint3d(parent,bone,{normalizationCenter:[0,0,0],normalizationScale:1,normalizedSize:[1,1,1]},
  {x:1,y:2,z:3,w:1,h:1,d:1},{x:0,y:0,z:0,w:1});
 assert.deepEqual(p,[4,2,3]);
});
test('socket configuration survives scene v2 conversion and returns with same target',()=>{
 const objects=[{id:1,name:'Actor',type:'mesh3d',x:0,y:0,w:64,h:64,depth3d:64},
 {id:2,name:'Weapon',type:'mesh3d',x:64,y:0,w:64,h:64,depth3d:64,socket3d:{enabled:true,targetId:1,bone:'Hand_R',offset:[0,.1,0]}}];
 const round=runtimeEntities(canonicalScene(objects));
 assert.deepEqual(round.find(x=>x.id===2).socket3d,objects[1].socket3d);
});
