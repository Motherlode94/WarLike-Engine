import test from 'node:test';import assert from 'node:assert/strict';
import {defaultAirplanePhysics,defaultHelicopterPhysics,validateAircraftConfig,solveAircraftForces} from '../js/core/aircraft-flight-physics.js';
const plane=defaultAirplanePhysics(),heli=defaultHelicopterPhysics();
const near=(a,b,tol=1e-5)=>assert.ok(Math.abs(a-b)<=tol,`Expected ${a} ≈ ${b}`);
test('aircraft defaults valid, reject invalid rotor or plane geometry',()=>{
 assert.deepEqual(validateAircraftConfig(plane),[]);assert.deepEqual(validateAircraftConfig(heli),[]);
 assert.ok(validateAircraftConfig({...plane,wingArea:0}).length);
 assert.ok(validateAircraftConfig({...heli,cyclicTiltDeg:120}).length);
 assert.throws(()=>solveAircraftForces({config:{kind:'jet'}}),/Aircraft/);
});
test('airplane stopped cannot create aerodynamic lift, throttle creates thrust',()=>{
 const idle=solveAircraftForces({config:plane});near(idle.lift,0);near(idle.drag,0);near(idle.force.y,0);
 const powered=solveAircraftForces({config:plane,controls:{throttle:1}});
 near(powered.force.z,-plane.maxThrust);near(powered.force.y,0);
});
test('airplane lift increases with relative airspeed, wind affects forces',()=>{
 const v={x:0,y:-5,z:-35},a=solveAircraftForces({config:plane,velocity:v});
 const b=solveAircraftForces({config:plane,velocity:{x:0,y:-10,z:-70}});
 assert.ok(a.lift>0);assert.ok(b.lift>a.lift);
 const tailWind=solveAircraftForces({config:plane,velocity:v,wind:{x:0,y:0,z:-20}});
 assert.ok(tailWind.airSpeed<a.airSpeed);
});
test('airplane stall detected at steep angle, drag resists velocity',()=>{
 const a=solveAircraftForces({config:plane,velocity:{x:0,y:-60,z:-10}});
 assert.equal(a.stalled,true);assert.ok(a.drag>0);
 const fast=solveAircraftForces({config:plane,velocity:{x:0,y:0,z:-50}});
 assert.ok(fast.force.z>0,'drag must oppose forward motion');
});
test('helicopter collective provides hover and rise, no collective creates no lift',()=>{
 const none=solveAircraftForces({config:heli});near(none.lift,0);
 const up=solveAircraftForces({config:heli,controls:{collective:.8},includeGravity:true});
 near(up.force.y,heli.maxThrust*.8-heli.mass*9.81);
 assert.ok(up.force.y>0);
});
test('helicopter cyclic steers thrust; controls and angular damping are bounded',()=>{
 const a=solveAircraftForces({config:heli,controls:{collective:1,pitch:1,roll:-1,yaw:5},angularVelocity:{x:1,y:2,z:0}});
 assert.ok(a.force.x<0&&a.force.z<0&&a.force.y>0);
 const b=solveAircraftForces({config:heli,controls:{collective:1,pitch:100,roll:-100,yaw:100},angularVelocity:{x:1,y:2,z:0}});
 near(a.force.x,b.force.x);near(a.force.z,b.force.z);near(a.torque.y,b.torque.y);
});
test('invalid nonorthogonal basis is refused, NaNs cannot propagate',()=>{
 assert.throws(()=>solveAircraftForces({config:plane,up:{x:0,y:0,z:-1}}),/orthonormal/);
 const result=solveAircraftForces({config:heli,velocity:{x:NaN,y:Infinity,z:0},controls:{collective:NaN},angularVelocity:{x:Infinity,y:0,z:0}});
 for(const n of [...Object.values(result.force),...Object.values(result.torque)])assert.ok(Number.isFinite(n));
});
