import test from 'node:test';
import assert from 'node:assert/strict';
import {stepPhysics3d,defaultRigidbody3d,applyImpulse3d} from '../js/core/physics-3d.js';

test('a dynamic body without obstacles advances and remains finite',()=>{
 const box={id:1,type:'mesh3d',x:0,y:0,w:20,h:20,depth3d:20,elevation3d:1,rigidbody3d:{...defaultRigidbody3d(),gravity:0,vx:30,vz:10}};
 for(let i=0;i<20;i++)stepPhysics3d([box],1/60);
 assert.ok(box.x>0);assert.ok(box.y>0);
 assert.ok(Number.isFinite(box.x)&&Number.isFinite(box.elevation3d));
});
test('collision against static solids stops horizontal motion',()=>{
 const moving={id:1,type:'mesh3d',x:0,y:0,w:10,h:20,depth3d:10,elevation3d:0,rigidbody3d:{...defaultRigidbody3d(),gravity:0,vx:100,restitution:0}};
 const wall={id:2,type:'mesh3d',x:20,y:0,w:10,h:20,depth3d:10,elevation3d:0,collision3d:true};
 for(let i=0;i<30;i++)stepPhysics3d([moving,wall],1/60);
 assert.ok(moving.x<=10,'body must not pass through wall');
});
test('impulse respects mass and rejects kinematic bodies',()=>{
 const obj={rigidbody3d:{...defaultRigidbody3d(),mass:2}};
 assert.equal(applyImpulse3d(obj,10,0,0),true);assert.equal(obj.rigidbody3d.vx,5);
 obj.rigidbody3d.kinematic=true;assert.equal(applyImpulse3d(obj,10,0,0),false);
});
