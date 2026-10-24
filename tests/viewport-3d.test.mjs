import test from 'node:test';
import assert from 'node:assert/strict';
import {sceneCamera3d,project3d,groundHit3d,objectBounds3d} from '../js/core/viewport-3d.js';

test('3D entity geometry maps existing 2D scene onto ground X/Z plus editable elevation',()=>{
 const b=objectBounds3d({x:64,y:128,w:64,h:128,elevation3d:2,type:'object',color:'#ffffff'});
 assert.equal(b.x,1.5);assert.equal(b.z,3);assert.equal(b.h,2);assert.equal(b.y,3);
});
test('camera projects its orbit target into the center of the screen',()=>{
 const target=[6,0,9],cam=sceneCamera3d(target,-.5,.7,25);
 const p=project3d(target,cam,1000,600);
 assert.ok(p);assert.ok(Math.abs(p.x-500)<.001);assert.ok(Math.abs(p.y-300)<.001);
});
test('ground ray intersects camera target at center of viewport',()=>{
 const target=[10,0,7],cam=sceneCamera3d(target,.35,.65,30);
 const hit=groundHit3d(500,300,cam,1000,600);
 assert.ok(hit);assert.ok(Math.abs(hit[0]-10)<.001);assert.ok(Math.abs(hit[1])<.001);assert.ok(Math.abs(hit[2]-7)<.001);
});
test('projection clips objects behind the camera',()=>{
 const c=sceneCamera3d([0,0,0],0,.5,25);
 const behind=[c.eye[0]-c.forward[0],c.eye[1]-c.forward[1],c.eye[2]-c.forward[2]];
 assert.equal(project3d(behind,c,800,600),null);
});
