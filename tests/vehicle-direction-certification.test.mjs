import test from 'node:test';
import assert from 'node:assert/strict';
import {stepArcadeVehicle} from '../js/core/arcade-driving.js';
import {signedGroundVehicleSpeed,defaultGroundVehiclePhysics,wheelDriveInput,groundVehicleInputs} from '../js/core/ground-vehicle-rapier.js';

const near=(a,b,epsilon=1e-7)=>assert.ok(Math.abs(a-b)<=epsilon,`expected ${a} ≈ ${b}`);
test('2D/3D arcade heading moves forward along -Y and turns right to +X',()=>{
 const forward=stepArcadeVehicle({speed:100,steer:0,rotation:0},{throttle:0,steer:0},.1);
 near(forward.dx,0);assert.ok(forward.dy<0);
 const right=stepArcadeVehicle({speed:100,steer:0,rotation:90},{throttle:0,steer:0},.1);
 assert.ok(right.dx>0);near(right.dy,0);
 const backward=stepArcadeVehicle({speed:-100,steer:0,rotation:0},{throttle:0,steer:0},.1);
 assert.ok(backward.dy>0);
});
test('physical signed velocity distinguishes forward, reverse and side slip',()=>{
 const body=(q,v)=>({rotation:()=>q,linvel:()=>v});
 const identity={x:0,y:0,z:0,w:1};
 near(signedGroundVehicleSpeed(body(identity,{x:0,y:0,z:-3})),-(-3)*64);
 near(signedGroundVehicleSpeed(body(identity,{x:0,y:0,z:2})),-2*64);
 near(signedGroundVehicleSpeed(body(identity,{x:4,y:0,z:0})),0);
 const turned={x:0,y:Math.SQRT1_2,z:0,w:Math.SQRT1_2};
 near(signedGroundVehicleSpeed(body(turned,{x:-2,y:0,z:0})),2*64);
 near(signedGroundVehicleSpeed(body(turned,{x:2,y:0,z:0})),-2*64);
});
test('tracked vehicle rotates on the spot without introducing sideways throttle',()=>{
 const config=defaultGroundVehiclePhysics('tracked'),inputs=groundVehicleInputs({throttle:0,steer:1});
 assert.equal(wheelDriveInput(config,config.wheels[0],inputs),1);
 assert.equal(wheelDriveInput(config,config.wheels[1],inputs),-1);
 assert.equal(wheelDriveInput(config,config.wheels[0],groundVehicleInputs({throttle:-1,steer:0})),-1);
});
