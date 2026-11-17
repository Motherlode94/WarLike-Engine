import test from 'node:test';
import assert from 'node:assert/strict';
import {
 EPSILON,clampMath,lerpMath,dot3,cross3,add3,subtract3,scale3,length3,normalize3,distance3,
 reflect3,project3,quaternionIdentity,normalizeQuaternion,quaternionMultiply,quaternionFromAxisAngle,
 quaternionRotate3,slerpQuaternion3,matrixIdentity4,multiplyMatrix4Math,transformPoint4,
 transformDirection4,invertMatrix4Math,rayAabb3,barycentric3,closestPointSegment3,fixedStepAccumulator
} from '../js/core/math-kernel.js';
import {composeTransformMatrix,identityMatrix4,multiplyMatrix4,invertMatrix4} from '../js/core/scene-graph-v2.js';
import {cameraObstacleForEntity} from '../js/core/play-camera.js';
import {projectedAxisDrag3d} from '../js/core/scene-editing-3d-tools.js';
const near=(a,b,epsilon=1e-8)=>assert.ok(Math.abs(a-b)<=epsilon,Math.abs(a-b)+' exceeds tolerance for '+a+' ≈ '+b);
const nearArray=(a,b,e=1e-8)=>{assert.equal(a.length,b.length);a.forEach((n,i)=>near(n,b[i],e))};
test('vector identities, perpendicular normals and safe zero-vector normalization',()=>{
 near(dot3([1,2,3],[4,5,6]),32);
 nearArray(cross3([1,0,0],[0,1,0]),[0,0,1]);
 near(dot3(cross3([1,2,3],[4,0,7]),[1,2,3]),0);
 nearArray(add3([1,2,3],[2,-2,1]),[3,0,4]);
 nearArray(subtract3([3,0,4],[2,-2,1]),[1,2,3]);
 nearArray(scale3([1,-2,3],2),[2,-4,6]);
 near(length3([3,4,0]),5);near(distance3([1,0,0],[4,4,0]),5);
 nearArray(normalize3([0,0,0]),[0,0,0]);near(length3(normalize3([1,2,3])),1);
 nearArray(reflect3([1,-1,0],[0,1,0]),[1,1,0]);
 nearArray(project3([4,8,0],[1,0,0]),[4,0,0]);
 assert.equal(clampMath(15,0,10),10);near(lerpMath(10,20,.25),12.5);
 assert.throws(()=>dot3([1,NaN,3],[1,0,0]),RangeError);
});
test('quaternion rotation uses radians, is normalized and slerps shortest arc',()=>{
 const q=quaternionFromAxisAngle([0,1,0],Math.PI/2);
 nearArray(quaternionRotate3(q,[1,0,0]),[0,0,-1]);
 nearArray(quaternionRotate3(q.map(n=>n*3),[1,0,0]),[0,0,-1]);
 const q180=quaternionFromAxisAngle([0,1,0],Math.PI);
 nearArray(quaternionRotate3(slerpQuaternion3(quaternionIdentity(),q180,.5),[1,0,0]),[0,0,-1]);
 nearArray(quaternionRotate3(quaternionMultiply(q,q),[1,0,0]),[-1,0,0]);
 nearArray(normalizeQuaternion([0,0,0,2]),[0,0,0,1]);
 assert.throws(()=>normalizeQuaternion([0,0,0,0]),RangeError);
});
test('column-major matrix inversion preserves points and vectors across non-uniform rotations',()=>{
 const m=composeTransformMatrix([13,-5,8],[15,-24,47],[2,3,.5]),inv=invertMatrix4Math(m);
 nearArray(multiplyMatrix4Math(m,inv),matrixIdentity4(),1e-8);
 nearArray(multiplyMatrix4Math(m,matrixIdentity4()),m);
 const p=[5,-4,1],v=[1,2,-2];
 nearArray(transformPoint4(inv,transformPoint4(m,p)),p);
 nearArray(transformDirection4(inv,transformDirection4(m,v)),v);
 nearArray(multiplyMatrix4Math(m,inv),multiplyMatrix4(m,invertMatrix4(m)));
 nearArray(identityMatrix4(),matrixIdentity4());
 assert.throws(()=>invertMatrix4Math(Array(16).fill(0)),RangeError);
 assert.throws(()=>transformPoint4(Array(16).fill(0),p),RangeError);
 const tiny=composeTransformMatrix([0,0,0],[0,0,0],[.00001,.00002,.00003]);
 nearArray(multiplyMatrix4Math(tiny,invertMatrix4Math(tiny)),matrixIdentity4(),1e-7);
});
test('ray/AABB returns nearest positive hit, normal, inside exit and safe parallel rejection',()=>{
 const min=[0,0,0],max=[2,2,2];
 const hit=rayAabb3([-3,1,1],[1,0,0],min,max);
 near(hit.distance,3);nearArray(hit.point,[0,1,1]);nearArray(hit.normal,[-1,0,0]);assert.equal(hit.inside,false);
 const inside=rayAabb3([1,1,1],[1,0,0],min,max);
 near(inside.distance,1);nearArray(inside.normal,[1,0,0]);assert.equal(inside.inside,true);
 assert.equal(rayAabb3([-1,3,1],[1,0,0],min,max),null);
 assert.equal(rayAabb3([3,1,1],[1,0,0],min,max),null);
 assert.throws(()=>rayAabb3([0,0,0],[0,0,0],min,max),RangeError);
});
test('barycentric and closest segment distinguish projected and degenerate geometry',()=>{
 nearArray(barycentric3([.25,.25,0],[0,0,0],[1,0,0],[0,1,0]),[.5,.25,.25]);
 assert.equal(barycentric3([0,0,0],[0,0,0],[1,1,1],[2,2,2]),null);
 const nearPoint=closestPointSegment3([3,2,0],[0,0,0],[2,0,0]);
 nearArray(nearPoint.point,[2,0,0]);near(nearPoint.t,1);
 nearArray(closestPointSegment3([4,2,0],[1,2,3],[1,2,3]).point,[1,2,3]);
});
test('fixed-step integration handles uneven frames, sub-steps, and invalid deltas',()=>{
 const a=fixedStepAccumulator(0,1/120);
 assert.equal(a.steps,0);near(a.remaining,1/120);
 const b=fixedStepAccumulator(a.remaining,1/120);
 assert.equal(b.steps,1);near(b.remaining,0);
 const c=fixedStepAccumulator(0,.5,{step:1/60,maxSteps:6,maxFrame:.1});
 assert.equal(c.steps,6);near(c.remaining,0);
 assert.throws(()=>fixedStepAccumulator(0,-1),RangeError);
});
test('camera obstacles and gizmo drag use same pure quaternion/vector math safely',()=>{
 const entity={x:0,y:0,w:64,h:64,depth3d:64,rotation:90,collider3d:{shape:'box',offsetX:1,offsetY:0,offsetZ:0}};
 const obstacle=cameraObstacleForEntity(entity);
 assert.ok([obstacle.x,obstacle.y,obstacle.z].every(Number.isFinite));
 near(obstacle.x,.5,1e-6);near(obstacle.z,1.5,1e-6);
 near(projectedAxisDrag3d({x:0,y:0},{x:100,y:0},50,0,2),1);
 near(projectedAxisDrag3d({x:0,y:0},{x:100,y:0},-50,0,2),-1);
});
