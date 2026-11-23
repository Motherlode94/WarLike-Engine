import test from 'node:test';import assert from 'node:assert/strict';
import RAPIER from '@dimforge/rapier3d-compat';
import {defaultAircraftLandingGear,validateAircraftLandingGear,applyAircraftLandingGearForces} from '../js/core/aircraft-landing-gear.js';
import {defaultAircraftSystems} from '../js/core/aircraft-systems.js';
import {defaultAirplanePhysics} from '../js/core/aircraft-flight-physics.js';
import {defaultRigidbody3d} from '../js/core/physics-3d.js';
import {defaultCollider3d} from '../js/core/collider-3d.js';
import {createRapierScene,stepRapierScene,disposeRapierScene} from '../js/core/rapier-physics-3d.js';
await RAPIER.init();
test('Aircraft gear default has three valid physical suspensions and no propulsion',()=>{
 for(const type of ['airplane','helicopter']){
  const g=defaultAircraftLandingGear(type);assert.deepEqual(validateAircraftLandingGear(g),[]);
  assert.equal(g.wheels.length,3);assert.ok(g.wheels.every(w=>w.wheel.driven===false));
 }
 const g=defaultAircraftLandingGear();g.wheels[0].wheel.radius=-.5;
 assert.ok(validateAircraftLandingGear(g).length);
});
test('Rapier gear raycasts against a real runway, retract disables all wheel force',()=>{
 const air=defaultAirplanePhysics(),base={id:1,name:'Runway',type:'mesh3d',x:-1000,y:-1000,w:2000,h:32,depth3d:2000,
  elevation3d:-.5,assetId:'primitive-cube',collision3d:true,solid3d:true};
 const craft={id:2,name:'Aircraft',type:'mesh3d',x:-120,y:-150,w:240,h:70,depth3d:300,
  elevation3d:.45,assetId:'primitive-cube',collision3d:true,solid3d:true,
  aircraftPhysics:{...air,enabled:true},aircraftSystems:defaultAircraftSystems(),
  aircraftLandingGear:defaultAircraftLandingGear(),
  collider3d:defaultCollider3d(),rigidbody3d:{...defaultRigidbody3d(),mass:air.mass,lockRotations:false}};
 const scene=createRapierScene(RAPIER,[base,craft]);
 try{
  stepRapierScene(scene,1/120);
  const result=applyAircraftLandingGearForces(scene,1/60);
  assert.ok(result[0]&&!result[0].error,JSON.stringify(result));
  assert.ok(result[0].contacts>=1,'Real raycast gear must contact physical runway '+JSON.stringify(result));
  craft.aircraftSystems.gear.deployed=false;
  assert.equal(applyAircraftLandingGearForces(scene,1/60)[0].retracted,true);
  assert.equal(applyAircraftLandingGearForces(scene,1/60)[0].contacts,0);
 }finally{disposeRapierScene(scene)}
});
