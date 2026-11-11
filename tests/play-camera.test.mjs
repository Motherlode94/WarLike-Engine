import test from 'node:test';import assert from 'node:assert/strict';
import {cameraRigFor,cameraTargetFor,cameraBoomFraction,cameraObstacleForEntity,resolveCameraBoom,cameraPose,cameraDamping,followCamera2d} from '../js/core/play-camera.js';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} ≠ ${b}`);
test('camera follow smoothing is independent of frame rate and does not overshoot',()=>{
 const evolve=hz=>{let value=0;for(let i=0;i<hz;i++)value+=(10-value)*cameraDamping(9,1/hz);return value};near(evolve(30),evolve(144));assert.ok(evolve(30)<10);near(cameraDamping(9,0),0);
});
test('third-person target follows player height and elevation instead of the floor',()=>{
 const rig=cameraRigFor({});assert.equal(rig.distance,4.8);const target=cameraTargetFor({x:4,y:5,z:7,h:2},rig);near(target[1],5.44);assert.equal(target[0],4);assert.equal(target[2],7);assert.equal(cameraRigFor({fpsController:{}}).mode,'firstPerson');assert.equal(cameraRigFor({cameraRig:{distance:999}}).distance,24);
});
test('camera boom stops before a wall, including parallel rays, and ignores obstacles behind the target',()=>{
 const target=[0,1,0],eye=[0,1,6],wall={x:0,y:1,z:3,w:4,h:3,d:.5};const fraction=cameraBoomFraction(target,eye,[wall]);assert.ok(fraction>0&&fraction<.46);assert.equal(cameraBoomFraction(target,eye,[{...wall,x:5}]),1);assert.equal(cameraBoomFraction(target,eye,[{...wall,z:-3}]),1);assert.equal(cameraBoomFraction(target,eye,[{...wall,z:0}]),1);
});
test('2D Play snaps on start, then follows smoothly without changing the editor camera object',()=>{
 const editor={x:15,y:25,zoom:2},player={x:100,y:80,w:20,h:40},viewport={width:800,height:600};const snap=followCamera2d(editor,player,viewport,1/60,{snap:true});assert.deepEqual(snap,{x:180,y:100,zoom:2});assert.deepEqual(editor,{x:15,y:25,zoom:2});const next=followCamera2d(snap,{...player,x:120},viewport,1/60);assert.ok(next.x<180&&next.x>140);
});
test('camera pose stays orthonormal after obstacle avoidance',()=>{
 const {forward,right,up}=cameraPose([0,1,0],[2,3,5]);for(const axis of [forward,right,up])near(Math.hypot(...axis),1);near(forward.reduce((n,v,i)=>n+v*right[i],0),0);near(forward.reduce((n,v,i)=>n+v*up[i],0),0);
});

test('a rotated narrow wall stops the third-person camera even when its unrotated AABB misses the boom',()=>{
 const target=[0,1,0],eye=[0,1,6],wall={x:1,y:1,z:3,w:.2,h:3,d:3};
 const half=Math.PI/8,rotated={...wall,quaternion:{x:0,y:Math.sin(half),z:0,w:Math.cos(half)}};
 assert.equal(cameraBoomFraction(target,eye,[wall]),1);
 const fraction=cameraBoomFraction(target,eye,[rotated]);
 assert.ok(fraction>0&&fraction<1,'Rotated wall must block: '+fraction);
 const clear=cameraBoomFraction(target,eye,[{...rotated,x:5}]);
 assert.equal(clear,1,'Distant rotated geometry must not shorten camera boom');
});
test('camera obstacle uses rotated BoxCollider geometry and offset',()=>{
 const wall={type:'mesh3d',x:0,y:0,w:64,h:128,depth3d:64,
  elevation3d:0,rotation:90,collider3d:{shape:'box',width:.2,height:2,depth:2,offsetX:1,offsetY:.2,offsetZ:0}};
 const collision=cameraObstacleForEntity(wall);
 assert.ok(collision.quaternion,'Camera should retain BoxCollider orientation');
 near(collision.w,.2);near(collision.h,2);near(collision.d,2);
 assert.ok(Math.abs(collision.z-.5)>.8,'Collider offset must follow rotation, not world X');
});
test('camera retracts immediately at contact and returns smoothly after wall clears',()=>{
 const target=[0,1,0],eye=[0,1,6],wall={x:0,y:1,z:3,w:4,h:3,d:.4};
 const hit=resolveCameraBoom(target,eye,[wall],{previousDistance:6,dt:1/60});
 assert.ok(hit.distance<3,'Camera penetrated the wall');
 const free=resolveCameraBoom(target,eye,[],{previousDistance:hit.distance,dt:1/60});
 assert.ok(free.distance>hit.distance&&free.distance<6,'Camera recovery must be progressive');
 const recovered=resolveCameraBoom(target,eye,[],{previousDistance:free.distance,dt:1});
 assert.ok(recovered.distance>free.distance,'Camera must eventually restore desired distance');
});

test('camera view basis never collapses against extremely close obstacles',()=>{
 for(const eye of [[0,1,0],[0,1,0.00000001],[0,10,0]]){
  const pose=cameraPose([0,1,0],eye);
  for(const axis of [pose.forward,pose.right,pose.up]){
   assert.ok(axis.every(Number.isFinite),'Camera direction must stay finite');
   assert.ok(Math.abs(Math.hypot(...axis)-1)<1e-8,'Camera direction must remain normalized');
  }
 }
});
