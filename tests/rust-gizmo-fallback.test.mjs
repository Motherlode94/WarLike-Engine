import test from 'node:test';
import assert from 'node:assert/strict';
import {axisRayParameter,gizmoPointerRay,rustGizmoStatus} from '../js/core/rust-gizmo-acceleration.js';
test('Rust gizmo is optional and retains JS fallback without a binary',()=>{
 assert.equal(rustGizmoStatus(),'fallback-js');
 assert.equal(axisRayParameter([0,0,1],[0,-1,0],[0,0,0],[1,0,0]),null);
});
test('pointer ray uses camera and viewport dimensions',()=>{
 const cam={eye:[0,2,5],forward:[0,0,-1],right:[1,0,0],up:[0,1,0]};
 const ray=gizmoPointerRay(100,100,{left:0,top:0,width:200,height:200},cam);
 assert.deepEqual(ray.origin,[0,2,5]);
 assert.deepEqual(ray.direction,[0,0,-1]);
});
