import test from 'node:test';
import assert from 'node:assert/strict';
import {legacyReferenceMatrix3d,composeTransformMatrix,multiplyMatrix4,affineCorrection3d} from '../js/core/scene-graph-v2.js';
import {stepRapierScene} from '../js/core/rapier-physics-3d.js';
test('Rapier dynamic body updates world translation without losing authored affine shear',()=>{
 const entity={id:5,name:'Sheared body',x:64,y:64,elevation3d:0,w:64,h:64,depth3d:64,rotation:0,rigidbody3d:{enabled:true}};
 entity.matrixReference3d=legacyReferenceMatrix3d(entity);
 entity.worldMatrix3d=multiplyMatrix4(composeTransformMatrix([2,0,0],[0,0,30],[2,1,1]),entity.matrixReference3d);
 const originalLinear=entity.worldMatrix3d.slice(0,12);
 const scene={world:{timestep:0,step(){}},actors:new Map([[5,{isDynamic:true,body:{
  translation:()=>({x:2.5,y:0.5,z:1.5}),linvel:()=>({x:1,y:0,z:0})
 },entity,width:1,height:1,depth:1,lastVelocity:{x:0,y:0,z:0}}]])};
 stepRapierScene(scene,1/60);
 assert.equal(entity.x,128);
 assert.deepEqual(entity.worldMatrix3d.slice(0,12),originalLinear);
 assert.ok(affineCorrection3d(entity));
 assert.equal(entity.rigidbody3d.vx,64);
});
