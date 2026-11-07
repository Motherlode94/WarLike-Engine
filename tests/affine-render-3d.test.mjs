import test from 'node:test';
import assert from 'node:assert/strict';
import {createScene,createGameObject,addGameObject,reparent,worldTransformMatrices,
 composeTransformMatrix,multiplyMatrix4,affineCorrection3d,normalMatrix3d,
 legacyReferenceMatrix3d,updateAffineEditorPose3d} from '../js/core/scene-graph-v2.js';
import {runtimeEntities,canonicalScene} from '../js/core/scene-contract.js';

const near=(a,b,eps=1e-6)=>{
 assert.equal(a.length,b.length);
 for(let i=0;i<a.length;i++)assert.ok(Math.abs(a[i]-b[i])<=eps*Math.max(1,Math.abs(a[i]),Math.abs(b[i])),`index ${i}: ${a[i]} vs ${b[i]}`);
};
const makeScene=()=>{
 const scene=createScene('Affine render');
 const parent=addGameObject(scene,createGameObject('Vehicle','a'));
 const child=addGameObject(scene,createGameObject('Turret','b'));
 Object.assign(parent.components[0],{position:[5,0,2],rotation:[0,45,0],scale:[2,1,3]});
 Object.assign(child.components[0],{position:[1,2,3],rotation:[15,30,10],scale:[1,1,1]});
 reparent(scene,'b','a');
 return {scene,parent,child};
};
test('canonical affine shear survives runtime conversion without dropping the visual matrix',()=>{
 const {scene}=makeScene(),expected=worldTransformMatrices(scene).get('b');
 const entities=runtimeEntities(scene),child=entities.find(e=>e.name==='Turret');
 assert.equal(child.worldMatrix3d.length,16);
 near(child.worldMatrix3d,expected);
 const corrected=affineCorrection3d(child);
 near(multiplyMatrix4(corrected,child.matrixReference3d),expected);
 const restored=canonicalScene(entities);
 near(worldTransformMatrices(restored).get('entity-'+child.id),expected);
});
test('affine inverse-transpose normal matrix handles skewed lighting',()=>{
 const shear=[2,0,0,0,1,3,0,0,0,0,1,0,4,5,6,1];
 const n=normalMatrix3d(shear);
 near(n,[.5,-1/6,0,0,1/3,0,0,0,1]);
});
test('moving affine gizmo keeps authored shear, moves world origin and resets reference consistently',()=>{
 const object={x:64,y:128,elevation3d:0,rotation:0};
 object.matrixReference3d=legacyReferenceMatrix3d(object);
 object.worldMatrix3d=multiplyMatrix4(composeTransformMatrix([10,0,0],[0,0,45],[2,1,1]),object.matrixReference3d);
 const before=affineCorrection3d(object),world=[...object.worldMatrix3d],ref=[...object.matrixReference3d];
 object.x+=64;
 assert.equal(updateAffineEditorPose3d(object,world,ref),true);
 assert.equal(object.worldMatrix3d.length,16);
 near(multiplyMatrix4(affineCorrection3d(object),object.matrixReference3d),object.worldMatrix3d);
 assert.ok(Number.isFinite(before[0]));
});
