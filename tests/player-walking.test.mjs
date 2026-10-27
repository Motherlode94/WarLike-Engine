import test from 'node:test';
import assert from 'node:assert/strict';
import {cameraRelativeWalk3d} from '../js/core/gameplay-components.js';

const close=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-9,actual+' != '+expected);

test('forward Z/W moves where third-person and FPS camera faces',()=>{
 const forward=cameraRelativeWalk3d(0,1,0);
 close(forward.x,0);close(forward.z,-1);
 const backward=cameraRelativeWalk3d(0,-1,0);
 close(backward.x,0);close(backward.z,1);
});
test('strafe D/A remains right/left of camera',()=>{
 const right=cameraRelativeWalk3d(1,0,0);
 close(right.x,1);close(right.z,0);
 const left=cameraRelativeWalk3d(-1,0,0);
 close(left.x,-1);close(left.z,0);
});
test('camera-relative walking rotates with camera yaw',()=>{
 const f=cameraRelativeWalk3d(0,1,Math.PI/2);
 close(f.x,-1);close(f.z,0);
 const r=cameraRelativeWalk3d(1,0,Math.PI/2);
 close(r.x,0);close(r.z,-1);
});
test('diagonals are normalized to avoid faster strafing and preserve idle',()=>{
 const d=cameraRelativeWalk3d(1,1,Math.PI/4);
 close(Math.hypot(d.x,d.z),1);
 assert.deepEqual(cameraRelativeWalk3d(0,0,.2),{x:0,z:0,length:0});
});
