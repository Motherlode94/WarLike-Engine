import test from 'node:test';import assert from 'node:assert/strict';
import {cameraRigFor,cameraTargetFor,cameraBoomFraction,cameraPose,cameraDamping,followCamera2d} from '../js/core/play-camera.js';
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
