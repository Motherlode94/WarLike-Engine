import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultAirplanePhysics,defaultHelicopterPhysics} from '../js/core/aircraft-flight-physics.js';
import {aircraftControls,applyAircraftForces,validateAircraftActor,rotateAircraftVector} from '../js/core/aircraft-rapier.js';
const identity={x:0,y:0,z:0,w:1};
const entity=(config)=>({id:5,aircraftPhysics:{...config,enabled:true},rigidbody3d:{enabled:true,kinematic:false,lockRotations:false,mass:config.mass},collision3d:true,collider3d:{enabled:true}});
const mock=(e,v={x:0,y:0,z:0})=>{
 const pushes=[],spins=[];
 const body={rotation:()=>identity,linvel:()=>v,angvel:()=>({x:0,y:0,z:0}),applyImpulse:(force,wake)=>pushes.push([force,wake]),applyTorqueImpulse:(torque,wake)=>spins.push([torque,wake])};
 return {scene:{actors:new Map([[e.id,{entity:e,body,isDynamic:true}]])},pushes,spins};
};
test('aerodynamics adapter preserves basis, clamps controls and validates dynamics',()=>{
 assert.deepEqual(rotateAircraftVector(identity,{x:0,y:0,z:-1}),{x:0,y:0,z:-1});
 assert.deepEqual(aircraftControls({throttle:2,collective:-1,pitch:3,roll:-5,yaw:NaN}),{throttle:1,collective:0,pitch:1,roll:-1,yaw:0});
 const e=entity(defaultAirplanePhysics());assert.deepEqual(validateAircraftActor(e),[]);
 e.rigidbody3d.lockRotations=true;assert.ok(validateAircraftActor(e).length);
});
test('airplane accelerates forward under thrust with real fixed step impulses',()=>{
 const e=entity(defaultAirplanePhysics()),s=mock(e);
 e.aircraftInput={throttle:1};const result=applyAircraftForces(s.scene,1/60);
 assert.equal(result[0].kind,'airplane');assert.equal(s.pushes.length,1);assert.equal(s.spins.length,1);
 assert.ok(s.pushes[0][0].z<0);assert.ok(Math.abs(s.pushes[0][0].y)<1e-8);
 assert.ok(Math.abs(s.pushes[0][0].z+e.aircraftPhysics.maxThrust/60)<1e-5);
});
test('helicopter collective produces upward rotor force without duplicating Rapier gravity',()=>{
 const e=entity(defaultHelicopterPhysics()),s=mock(e);e.aircraftInput={collective:.75};
 const result=applyAircraftForces(s.scene,1/60);
 assert.equal(result[0].kind,'helicopter');assert.ok(s.pushes[0][0].y>0);
 assert.ok(Math.abs(s.pushes[0][0].y-e.aircraftPhysics.maxThrust*.75/60)<1e-5);
});
test('disabled and invalid aircraft never receive impulses',()=>{
 const e=entity(defaultHelicopterPhysics()),s=mock(e);
 e.aircraftPhysics.enabled=false;assert.deepEqual(applyAircraftForces(s.scene,.016),[]);
 e.aircraftPhysics.enabled=true;e.groundVehiclePhysics={enabled:true};
 assert.ok(applyAircraftForces(s.scene,.016)[0].error);assert.equal(s.pushes.length,0);
});
test('no Rapier actor or invalid timestep is a no-op',()=>{
 const e=entity(defaultAirplanePhysics()),s=mock(e);
 assert.deepEqual(applyAircraftForces(s.scene,0),[]);
 assert.deepEqual(applyAircraftForces(null,1/60),[]);
 assert.equal(s.pushes.length,0);
});
