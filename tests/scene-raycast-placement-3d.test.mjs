import test from 'node:test';
import assert from 'node:assert/strict';
import {raycastTriangles3d} from '../js/core/viewport-3d.js';
import {gizmoAxis3d,placeEntityOnSurface3d,snap3d} from '../js/core/scene-graph-v2.js';
import {rotationQuaternion3d} from '../js/core/collider-3d.js';
const triangle=new Float32Array([
 -1,0,-1,0,1,0,1,0,-1,0,1,0,0,0,1,0,1,0
]);
test('raycast hits the real triangle, not its encompassing box',()=>{
 const hit=raycastTriangles3d([0,2,0],[0,-1,0],triangle,v=>v);
 assert.ok(hit);assert.ok(Math.abs(hit.distance-2)<1e-7);
 assert.deepEqual(hit.point,[0,0,0]);assert.ok(hit.normal[1]>0);
 const miss=raycastTriangles3d([.95,2,.95],[0,-1,0],triangle,v=>v);
 assert.equal(miss,null);
});
test('surface raycasting transforms GLB triangles and returns oriented surface normal',()=>{
 const hit=raycastTriangles3d([2,3,1],[0,-1,0],triangle,v=>[v[0]+2,v[1]+1,v[2]+1]);
 assert.ok(hit);assert.ok(Math.abs(hit.point[1]-1)<1e-7);
});
test('placement uses world metres, height, user snapping and requested surface normal',()=>{
 const obj={w:128,h:64,depth3d:64};
 placeEntityOnSurface3d(obj,{point:[2.27,3.19,1.23],normal:[0,1,0]},{snap:.5,alignNormal:true});
 assert.equal(obj.x,96);assert.equal(obj.y,32);assert.equal(obj.elevation3d,3);
 assert.equal(obj.rotationX3d,0);assert.equal(obj.rotationZ3d,0);
 assert.equal(snap3d(3.24,.5),3);
 assert.throws(()=>snap3d(1,-1),/invalide/);
});
test('local 3D axis follows the object quaternion, global axis remains unchanged',()=>{
 const q=rotationQuaternion3d({rotation:90});
 assert.deepEqual(gizmoAxis3d('x',q),[1,0,0]);
 const local=gizmoAxis3d('x',q,{local:true});
 assert.ok(Math.abs(local[0])<1e-5);assert.ok(Math.abs(Math.abs(local[2])-1)<1e-5);
});
