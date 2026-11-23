import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultWheelPhysics,solveWheelForces} from '../js/core/vehicle-wheel-physics.js';
import {defaultGroundVehiclePhysics,applyGroundVehicleForces} from '../js/core/ground-vehicle-rapier.js';

const wheel={...defaultWheelPhysics(),rollingResistance:0,grip:2};
const mass=362.5,dt=1/60;
const angle=.22,cos=Math.cos(angle),sin=Math.sin(angle);
const contact={distance:.55,normal:{x:0,y:cos,z:sin},point:{x:0,y:-.55,z:0}};
const forward={x:0,y:sin,z:-cos};
const state={velocity:{x:0,y:0,z:0},angularVelocity:{x:0,y:0,z:0},
 forward,centerOfMass:{x:0,y:0,z:0},gravity:15};
const dot=(a,b)=>a.x*b.x+a.y*b.y+a.z*b.z;
const solve=(changes={})=>solveWheelForces({wheel,contact,state,dt,effectiveMass:mass,brakeForce:10000,
 inputs:{brake:1},...changes});

test('brake holds vehicle stationary on uphill slope using entity gravity',()=>{
 const r=solve();
 assert.equal(r.grounded,true);
 assert.ok(r.normalForce>0);
 const force=dot(r.force,forward);
 assert.ok(Math.abs(force-mass*15*sin)<1e-6,
  'uphill hold must cancel gravity projected along the incline');
});
test('hill-hold force reverses on downhill orientation',()=>{
 const downhill={x:0,y:-sin,z:cos};
 const r=solve({state:{...state,forward:downhill}});
 assert.ok(Math.abs(dot(r.force,downhill)+mass*15*sin)<1e-6);
});
test('flat ground and released brakes have no hill-hold thrust',()=>{
 const flat=solve({contact:{...contact,normal:{x:0,y:1,z:0}},
  state:{...state,forward:{x:0,y:0,z:-1}}});
 assert.ok(Math.abs(flat.force.z)<1e-10);
 const released=solve({inputs:{brake:0,handbrake:0}});
 assert.ok(Math.abs(dot(released.force,forward))<1e-10);
});
test('weak brakes and slippery terrain cannot create unlimited static hill hold',()=>{
 const weak=solve({brakeForce:100});
 assert.ok(Math.abs(dot(weak.force,forward))<=100+1e-8);
 const slick=solve({wheel:{...wheel,grip:.01}});
 const tangent=dot(slick.force,forward);
 assert.ok(Math.abs(tangent)<=slick.normalForce*.01+1e-8);
});
test('moving wheels retain anti-reversal braking with gravity projection',()=>{
 for(const longitudinal of [-.06,.06]){
  const moving={...state,velocity:{x:0,y:forward.y*longitudinal,z:forward.z*longitudinal}};
  const r=solve({state:moving});
  const braking=dot(r.force,forward);
  const nextVelocity=longitudinal+(braking/mass-15*sin)*dt;
  assert.ok(Math.abs(nextVelocity)<1e-8,'braking must stop without reversing on a slope');
 }
});
test('Rapier adapter uses the actual Rigidbody3D gravity rather than hardcoded 9.81',()=>{
 const config=defaultGroundVehiclePhysics('car');
 const calls=[];
 const q={x:Math.sin(angle/2),y:0,z:0,w:Math.cos(angle/2)};
 const body={rotation:()=>q,translation:()=>({x:0,y:1,z:0}),
 linvel:()=>({x:0,y:0,z:0}),angvel:()=>({x:0,y:0,z:0}),
 applyImpulseAtPoint:(impulse)=>calls.push(impulse)};
 const scene={api:{Ray:class{constructor(origin,direction){Object.assign(this,{origin,direction})}},
 QueryFilterFlags:{EXCLUDE_SENSORS:8}},
 world:{castRayAndGetNormal:()=>({timeOfImpact:.55,normal:contact.normal})},
 actors:new Map([[1,{body,isDynamic:true,entity:{id:1,groundVehiclePhysics:config,
  groundVehicleInput:{brake:1},rigidbody3d:{lockRotations:false,gravity:6}}}]])};
 const result=applyGroundVehicleForces(scene,dt);
 assert.equal(result[0].contacts,4);
 assert.equal(calls.length,4);
 const resultant=calls.reduce((sum,v)=>sum+v.z,0);
 assert.ok(Number.isFinite(resultant));
});
