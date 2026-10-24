import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultRigidbody3d,stepPhysics3d,applyImpulse3d,overlap3d} from '../js/core/physics-3d.js';

test('rigidbody gravity brings object to floor',()=>{
 const o={id:1,type:'mesh3d',x:0,y:0,w:25,h:25,elevation3d:2,rigidbody3d:{...defaultRigidbody3d(),restitution:0}};
 for(let i=0;i<120;i++)stepPhysics3d([o],1/60);
 assert.equal(o.elevation3d,0);
});
test('impulse respects mass and kinematic setting',()=>{
 const o={rigidbody3d:{...defaultRigidbody3d(),mass:2}};
 assert.equal(applyImpulse3d(o,10,4,0),true);
 assert.equal(o.rigidbody3d.vx,5);
 assert.equal(o.rigidbody3d.vy,2);
 o.rigidbody3d.kinematic=true;
 assert.equal(applyImpulse3d(o,10,0,0),false);
});
test('AABB overlap detects contact using elevation',()=>{
 const a={x:0,y:0,w:20,h:20,elevation3d:0};
 const b={x:10,y:10,w:20,h:20,elevation3d:0};
 assert.equal(overlap3d(a,b),true);
 b.elevation3d=4;
 assert.equal(overlap3d(a,b),false);
});
