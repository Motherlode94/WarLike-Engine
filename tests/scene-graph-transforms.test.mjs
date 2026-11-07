import test from 'node:test';
import assert from 'node:assert/strict';
import {createScene,createGameObject,addGameObject,reparent,worldTransformMatrices,composeTransformMatrix,multiplyMatrix4,invertMatrix4,decomposeTransformMatrix,setLocalTransform,validateScene} from '../js/core/scene-graph-v2.js';
const near=(a,b,epsilon=1e-7)=>{assert.equal(a.length,b.length);for(let i=0;i<a.length;i++)assert.ok(Math.abs(a[i]-b[i])<=epsilon*Math.max(1,Math.abs(a[i]),Math.abs(b[i])),`index ${i}: ${a[i]} != ${b[i]}`)};
const sceneWith=()=>{
 const s=createScene('Test');
 const a=addGameObject(s,createGameObject('parent','a'));
 const b=addGameObject(s,createGameObject('child','b'));
 const t=a.components[0];t.position=[5,1,-3];t.rotation=[11,42,9];t.scale=[2,1,3];
 b.components[0].position=[2,3,4];b.components[0].rotation=[32,15,24];
 return {s,a,b};
};
test('TRS composition, inverse and matrix multiplication use correct column-major convention',()=>{
 const m=composeTransformMatrix([2,3,4],[10,20,30],[2,3,4]);
 near(multiplyMatrix4(invertMatrix4(m),m),[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);
 near(multiplyMatrix4(m,invertMatrix4(m)),[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);
});
test('hierarchy reparent keeps exact world matrix even when new local has shear',()=>{
 const {s,b}=sceneWith(),before=worldTransformMatrices(s).get('b');
 reparent(s,'b','a');near(worldTransformMatrices(s).get('b'),before);
 assert.equal(b.parentId,'a');assert.equal(b.components[0].matrixMode,'affine');
 assert.equal(b.components[0].matrix.length,16);
 reparent(s,'b',null);near(worldTransformMatrices(s).get('b'),before);
 assert.equal(b.components[0].matrix,undefined);
});
test('moving parent updates child world matrix, but child local remains unchanged',()=>{
 const {s,a,b}=sceneWith();reparent(s,'b','a');
 const local=b.components[0].matrix.slice(),before=worldTransformMatrices(s).get('b');
 setLocalTransform(s,'a',{position:[9,1,-3]});
 const after=worldTransformMatrices(s).get('b');
 assert.ok(Math.abs(after[12]-before[12]-4)<1e-7);
 assert.deepEqual(b.components[0].matrix,local);
});
test('singular parent and cyclic parenting reject without any mutation',()=>{
 const {s,a,b}=sceneWith();a.components[0].scale=[1e-14,1,1];
 const original=structuredClone(b);
 assert.throws(()=>reparent(s,'b','a'),/inversible/);
 assert.deepEqual(b,original);
 a.components[0].scale=[1,1,1];reparent(s,'b','a');
 assert.throws(()=>reparent(s,'a','b'),/cyclique/);
 assert.equal(a.parentId,null);
});
test('shear cannot be losslessly decomposed into TRS, explicit edits clear affine override',()=>{
 const {s,b}=sceneWith();reparent(s,'b','a');
 assert.equal(decomposeTransformMatrix(b.components[0].matrix),null);
 setLocalTransform(s,'b',{position:[3,2,1],rotation:[0,0,0],scale:[1,1,1]});
 assert.equal(b.components[0].matrix,undefined);
 assert.equal(validateScene(s).length,0);
});
test('ordinary rotation and scale decompose with exact roundtrip',()=>{
 for(const euler of [[0,0,0],[10,20,30],[-40,80,25],[20,90,45]]){
  const original=composeTransformMatrix([1,2,3],euler,[2,3,4]);
  const decomposed=decomposeTransformMatrix(original);
  assert.ok(decomposed,JSON.stringify(euler));
  near(composeTransformMatrix(decomposed.position,decomposed.rotation,decomposed.scale),original);
 }
});
