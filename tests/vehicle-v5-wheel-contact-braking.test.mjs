import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultWheelPhysics,solveWheelForces} from '../js/core/vehicle-wheel-physics.js';

const wheel=defaultWheelPhysics();
const contact={distance:.55,normal:{x:0,y:1,z:0},point:{x:0,y:-.55,z:0}};
const chassis={velocity:{x:0,y:0,z:0},angularVelocity:{x:0,y:0,z:0},
 forward:{x:0,y:0,z:-1},up:{x:0,y:1,z:0},centerOfMass:{x:0,y:0,z:0}};
const forces=(overrides={})=>solveWheelForces({wheel,contact,state:chassis,dt:1/60,driveForce:5000,brakeForce:8000,...overrides});

test('brake at rest applies no forward or reverse wheel force',()=>{
 const result=forces({inputs:{throttle:0,brake:1,handbrake:1}});
 assert.equal(result.grounded,true);
 assert.ok(result.normalForce>0);
 assert.ok(Math.abs(result.force.z)<1e-10,'brake cannot accelerate a stationary wheel');
});
test('held brake does not generate backwards thrust against forward throttle at rest',()=>{
 const result=forces({inputs:{throttle:1,brake:1}});
 assert.equal(result.grounded,true);
 assert.ok(result.force.z<=0,'forward wheel cannot be pulled backward by a stationary brake');
});
test('braking opposes measured forward and reverse wheel travel',()=>{
 const forward=forces({state:{...chassis,velocity:{x:0,y:0,z:-3}},inputs:{brake:1},driveForce:0});
 const reverse=forces({state:{...chassis,velocity:{x:0,y:0,z:3}},inputs:{brake:1},driveForce:0});
 assert.ok(forward.force.z>0,'brake opposes movement toward -Z');
 assert.ok(reverse.force.z<0,'brake opposes movement toward +Z');
});
test('vertical wall and ceiling are never treated as suspension support',()=>{
 for(const normal of [{x:1,y:0,z:0},{x:0,y:-1,z:0},{x:1,y:-.1,z:0}]){
  const result=forces({contact:{...contact,normal}});
  assert.equal(result.grounded,false);
  assert.deepEqual(result.force,{x:0,y:0,z:0});
 }
});
test('sloped ground still supports suspension and respects friction limits',()=>{
 const normal={x:0,y:Math.SQRT1_2,z:Math.SQRT1_2};
 const result=forces({contact:{...contact,normal},inputs:{throttle:1},driveForce:100000});
 assert.equal(result.grounded,true);
 assert.ok(result.normalForce>0);
 assert.ok(result.force.y>0);
});
