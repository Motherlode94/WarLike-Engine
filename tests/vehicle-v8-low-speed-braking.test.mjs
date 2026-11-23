import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultWheelPhysics,solveWheelForces} from '../js/core/vehicle-wheel-physics.js';

const wheel={...defaultWheelPhysics(),rollingResistance:0,grip:100};
const contact={distance:.55,normal:{x:0,y:1,z:0},point:{x:0,y:-.55,z:0}};
const mass=362.5,dt=1/60;
function braking(speed,extra={}){
 const state={velocity:{x:0,y:0,z:-speed},angularVelocity:{x:0,y:0,z:0},
  forward:{x:0,y:0,z:-1},centerOfMass:{x:0,y:0,z:0}};
 return solveWheelForces({wheel,contact,state,inputs:{brake:1},dt,effectiveMass:mass,brakeForce:20000,...extra});
}
test('forward and reverse low-speed braking cannot reverse velocity in one Rapier step',()=>{
 for(const speed of [.02,.1,.5,-.02,-.1,-.5]){
  const r=braking(speed);
  const longitudinalForce=-r.force.z;
  const nextSpeed=speed+longitudinalForce/mass*dt;
  assert.ok(Math.abs(nextSpeed)<1e-8,`speed ${speed} became ${nextSpeed}`);
 }
});
test('braking remains within available friction circle',()=>{
 const r=braking(5,{wheel:{...wheel,grip:.1}});
 assert.ok(Math.hypot(r.force.x,r.force.z)<=r.normalForce*.1+1e-6);
});
test('brake direction opposes signed travel and produces no thrust at rest',()=>{
 assert.ok(braking(3).force.z>0);
 assert.ok(braking(-3).force.z<0);
 assert.equal(braking(0).force.z,0);
});
test('larger step permits proportionally smaller force to cancel a fixed speed',()=>{
 const fast=braking(.05,{dt:1/120});
 const slow=braking(.05,{dt:1/30});
 assert.ok(Math.abs(fast.force.z)>Math.abs(slow.force.z)*3.99);
});
test('legacy wheel-force callers without mass retain explicit brake-force behavior',()=>{
 const r=braking(2,{effectiveMass:0,brakeForce:300});
 assert.ok(Math.abs(r.force.z-300)<1e-9);
});
