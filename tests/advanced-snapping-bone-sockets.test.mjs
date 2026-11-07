import test from 'node:test';
import assert from 'node:assert/strict';
import {snapSurfaceFeature3d,boneSocketTransform3d,composeTransformMatrix,validateBoneSocketTarget3d} from '../js/core/scene-graph-v2.js';
import {quaternionEuler3d} from '../js/core/collider-3d.js';
const near=(a,b,epsilon=1e-5)=>assert.ok(Math.abs(a-b)<epsilon, `${a} != ${b}`);
const quat={x:0,y:0,z:0,w:1};
const geometry={normalizationCenter:[0,0,0],normalizationScale:1,normalizedSize:[1,1,1]};
const box={x:0,y:0,z:0,w:1,h:1,d:1};
test('real mesh vertex snapping uses nearest vertex within tolerance',()=>{
 const hit={point:[.08,.02,0],vertices:[[0,0,0],[1,0,0],[0,1,0]],distance:2};
 const result=snapSurfaceFeature3d(hit,'vertex',{radius:.15});
 assert.deepEqual(result.point,[0,0,0]);assert.equal(result.snapKind,'vertex');
 assert.deepEqual(snapSurfaceFeature3d(hit,'vertex',{radius:.01}).point,hit.point);
});
test('edge snapping projects to finite segment and ignores distant features',()=>{
 const hit={point:[.4,.04,0],vertices:[[0,0,0],[1,0,0],[0,1,0]],distance:2};
 const result=snapSurfaceFeature3d(hit,'edge',{radius:.08});
 near(result.point[0],.4);near(result.point[1],0);near(result.point[2],0);
 assert.equal(result.snapKind,'edge');
 assert.deepEqual(snapSurfaceFeature3d(hit,'edge',{radius:.01}).point,hit.point);
});
test('socket offset rotates with a bone, never uses world XYZ',()=>{
 const bone=composeTransformMatrix([2,0,0],[0,0,90],[1,1,1]);
 const socket=boneSocketTransform3d({},bone,geometry,box,quat,[1,0,0]);
 near(socket.point[0],2);near(socket.point[1],1);near(socket.point[2],0);
 const euler=quaternionEuler3d(socket.quaternion);
 near(euler.rotationZ3d,90);
});
test('socket follows parent model quaternion and orthogonalizes affine shear',()=>{
 const bone=composeTransformMatrix([0,0,0],[0,0,0],[2,1,1]);
 bone[4]=.7; // shear
 const parent={};
 const q={x:0,y:Math.sin(Math.PI/4),z:0,w:Math.cos(Math.PI/4)};
 const result=boneSocketTransform3d(parent,bone,geometry,box,q,[0,0,0]);
 const euler=quaternionEuler3d(result.quaternion);
 near(Math.abs(euler.rotation),90);
 near(Math.hypot(...Object.values(result.quaternion)),1);
});
test('socket reports singular bone transformations instead of producing NaN',()=>{
 const bad=composeTransformMatrix([0,0,0],[0,0,0],[0,1,1]);
 assert.throws(()=>boneSocketTransform3d({},bad,geometry,box,quat),/singulière/);
});

test('socket graph rejects cycles through sockets and GameObject parent links',()=>{
 const entities=[
  {id:1,parentId:null,socket3d:{enabled:true,targetId:2}},
  {id:2,parentId:null},
  {id:3,parentId:1}
 ];
 assert.throws(()=>validateBoneSocketTarget3d(entities,2,1),/cyclique/);
 assert.throws(()=>validateBoneSocketTarget3d(entities,1,3),/cyclique/);
 assert.throws(()=>validateBoneSocketTarget3d(entities,1,99),/introuvable/);
 assert.equal(validateBoneSocketTarget3d(entities,3,2),true);
});
