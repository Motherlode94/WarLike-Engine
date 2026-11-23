import test from 'node:test';
import assert from 'node:assert/strict';
import {moveVehicleWithCollision,stepArcadeVehicle} from '../js/core/arcade-driving.js';

test('diagonal collision stops both axes instead of sliding vehicle along wall',()=>{
 const car={x:0,y:0};
 const hit=moveVehicleWithCollision(car,{dx:50,dy:50},(x,y)=>x>=20,{maxStep:5});
 assert.equal(hit.collision,true);
 assert.ok(car.x<20);
 assert.ok(Math.abs(car.x-car.y)<1e-9,'vehicle drifted sideways from its heading');
});
test('swept high-speed vehicle cannot pass through a thin obstacle',()=>{
 const car={x:0,y:0};
 const hit=moveVehicleWithCollision(car,{dx:100,dy:0},(x,y)=>x>=34&&x<=38,{maxStep:2});
 assert.equal(hit.collision,true);
 assert.ok(car.x<34);
 assert.equal(car.y,0);
});
test('unblocked forward and reverse maintain the same heading line',()=>{
 const car={x:10,y:10};
 const a=moveVehicleWithCollision(car,{dx:15,dy:-25},()=>false,{maxStep:3});
 assert.equal(a.collision,false);assert.ok(Math.abs(car.x-25)<1e-9);assert.ok(Math.abs(car.y+15)<1e-9);
 const b=moveVehicleWithCollision(car,{dx:-15,dy:25},()=>false,{maxStep:3});
 assert.equal(b.collision,false);assert.ok(Math.abs(car.x-10)<1e-9);assert.ok(Math.abs(car.y-10)<1e-9);
});
test('zero displacement does not move the vehicle',()=>{
 const car={x:8,y:-6};
 assert.deepEqual(moveVehicleWithCollision(car,{dx:0,dy:0},()=>false),{collision:false,moved:false});
 assert.deepEqual(car,{x:8,y:-6});
});
test('steering heading and swept translation stay aligned',()=>{
 const frame=stepArcadeVehicle({speed:120,steer:0,rotation:45},{throttle:0,steer:0},1/60);
 const car={x:0,y:0};
 moveVehicleWithCollision(car,frame,()=>false);
 assert.ok(car.x>0&&car.y<0);
 assert.ok(Math.abs(car.x+car.y)<1e-8);
});
