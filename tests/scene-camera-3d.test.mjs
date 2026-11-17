import test from 'node:test';
import assert from 'node:assert/strict';
import {activeSceneCamera,defaultSceneCamera,sceneCameraView,cameraMovementYaw} from '../js/core/scene-camera-3d.js';

const camera=(id,priority=0)=>({id,x:0,y:320,elevation3d:2,rotation:0,rotationX3d:0,sceneCamera3d:{...defaultSceneCamera(),priority}});

test('a real Main Camera uses priority and can be disabled',()=>{
 const a=camera(1,0),b=camera(2,10),scene=[a,b];
 assert.equal(activeSceneCamera(scene),b);
 b.sceneCamera3d.enabled=false;
 assert.equal(activeSceneCamera(scene),a);
 assert.equal(activeSceneCamera([]),null);
});
test('fixed Camera pose faces scene from its transform and exposes the lens',()=>{
 const c=camera(1);
 c.sceneCamera3d.fieldOfView=75;
 const pose=sceneCameraView(c,[c]);
 assert.deepEqual(pose.eye,[0,2,5]);
 assert.ok(Math.abs(pose.forward[2]+1)<1e-6);
 assert.equal(pose.fieldOfView,75);
 assert.ok(Math.abs(cameraMovementYaw(pose))<1e-6);
});
test('follow Camera looks at selected GameObject and survives a missing target',()=>{
 const c=camera(1),player={id:7,type:'player',x:64,y:0,w:64,h:128,depth3d:64,elevation3d:0};
 c.sceneCamera3d.mode='thirdPerson';c.sceneCamera3d.targetId=7;
 const pose=sceneCameraView(c,[c,player]);
 assert.ok(pose.forward[2]<0);
 const previousEye=[...pose.eye];player.x+=64;
 const moved=sceneCameraView(c,[c,player]);
 assert.ok(moved.eye[0]>previousEye[0]+.9,'Follow Camera tracks player in world space');
 c.sceneCamera3d.targetId=5000;
 assert.ok(sceneCameraView(c,[c,player]));
});

test('first-person camera tracks player eyes and respects mouse yaw',()=>{
 const c=camera(1),player={id:4,type:'player',x:0,y:0,w:64,h:128,depth3d:64,elevation3d:0};
 c.sceneCamera3d.mode='firstPerson';c.sceneCamera3d.targetId=4;
 const view=sceneCameraView(c,[c,player],{yaw:Math.PI/2,pitch:0});
 assert.ok(view.forward[0]<-.99);
 assert.ok(Math.abs(cameraMovementYaw(view)-Math.PI/2)<1e-5);
});

test('third-person camera rotates around player when mouse changes yaw',()=>{
 const c=camera(2),player={id:7,type:'player',x:0,y:0,w:64,h:128,depth3d:64,elevation3d:0};
 c.sceneCamera3d.mode='thirdPerson';c.sceneCamera3d.targetId=7;
 const back=sceneCameraView(c,[c,player],{yaw:0,pitch:0});
 const side=sceneCameraView(c,[c,player],{yaw:Math.PI/2,pitch:0});
 assert.ok(back.eye[2]>side.eye[2]+3,'third-person boom should orbit horizontally');
 assert.ok(side.eye[0]>back.eye[0]+3,'third-person camera should orbit to player side');
 assert.ok(Math.abs(cameraMovementYaw(side)-Math.PI/2)<1e-6,'movement must use camera heading in TPS');
});
test('first-person and third-person share the same horizontal heading',()=>{
 const c=camera(2),player={id:7,type:'player',x:0,y:0,w:64,h:128,depth3d:64,elevation3d:0};
 c.sceneCamera3d.targetId=7;
 c.sceneCamera3d.mode='firstPerson';
 const fps=sceneCameraView(c,[c,player],{yaw:.8,pitch:.2});
 c.sceneCamera3d.mode='thirdPerson';
 const tps=sceneCameraView(c,[c,player],{yaw:.8,pitch:.2});
 assert.ok(Math.abs(cameraMovementYaw(fps)-cameraMovementYaw(tps))<1e-6);
});
