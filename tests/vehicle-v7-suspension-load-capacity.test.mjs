import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultGroundVehiclePhysics} from '../js/core/ground-vehicle-rapier.js';
import {solveWheelForces} from '../js/core/vehicle-wheel-physics.js';

const gravity=9.81;
const state={velocity:{x:0,y:0,z:0},angularVelocity:{x:0,y:0,z:0},
 forward:{x:0,y:0,z:-1},centerOfMass:{x:0,y:0,z:0}};

test('each ground vehicle profile can carry its weight before reaching maximum suspension travel',()=>{
 for(const kind of ['car','truck','tracked']){
  const config=defaultGroundVehiclePhysics(kind);
  const capacity=config.wheels.reduce((sum,m)=>sum+m.wheel.spring*Math.min(m.wheel.travel,m.wheel.restLength),0);
  const weight=config.mass*gravity;
  assert.ok(capacity>weight,kind+' cannot support its own weight: '+capacity+' N < '+weight+' N');
  const staticCompression=weight/config.wheels.reduce((sum,m)=>sum+m.wheel.spring,0);
  const minTravel=Math.min(...config.wheels.map(m=>m.wheel.travel));
  assert.ok(staticCompression<minTravel*.9,kind+' has insufficient travel reserve');
 }
});

test('resting car, truck and tracked wheel springs balance static chassis weight',()=>{
 for(const kind of ['car','truck','tracked']){
  const config=defaultGroundVehiclePhysics(kind);
  const springSum=config.wheels.reduce((sum,m)=>sum+m.wheel.spring,0);
  const compression=config.mass*gravity/springSum;
  let total=0;
  for(const {wheel} of config.wheels){
   const distance=wheel.radius+wheel.restLength-compression;
   const r=solveWheelForces({wheel,contact:{distance,normal:{x:0,y:1,z:0},
    point:{x:0,y:-distance,z:0}},state,dt:1/60});
   assert.equal(r.grounded,true,kind+' lost ground contact');
   assert.ok(r.compression>0&&r.compression<wheel.travel,kind+' bottomed out');
   total+=r.normalForce;
  }
  assert.ok(Math.abs(total-config.mass*gravity)<1e-6,kind+' spring force does not balance gravity');
 }
});

test('all heavy-vehicle wheels retain suspension force at partial compression',()=>{
 for(const kind of ['truck','tracked']){
  const config=defaultGroundVehiclePhysics(kind);
  const compression=config.mass*gravity/config.wheels.reduce((sum,m)=>sum+m.wheel.spring,0);
  for(const mount of config.wheels){
   const wheel=mount.wheel,contact={distance:wheel.radius+wheel.restLength-compression,
    normal:{x:0,y:1,z:0},point:{x:mount.position.x,y:-.55,z:mount.position.z}};
   const result=solveWheelForces({wheel,contact,state,dt:1/60});
   assert.ok(result.normalForce>0);
  }
 }
});
