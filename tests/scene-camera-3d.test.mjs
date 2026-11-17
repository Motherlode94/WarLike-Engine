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
 c.sceneCamera3d.mode='follow';c.sceneCamera3d.targetId=7;
 const pose=sceneCameraView(c,[c,player]);
 assert.ok(pose.forward[0]>0);
 c.sceneCamera3d.targetId=5000;
 assert.ok(sceneCameraView(c,[c,player]));
});
