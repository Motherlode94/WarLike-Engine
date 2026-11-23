import test from 'node:test';import assert from 'node:assert/strict';
import {defaultAircraftSystems,validateAircraftSystems,aircraftAeroModifiers,stepAircraftSystems} from '../js/core/aircraft-systems.js';
test('V6 default systems have validated gear, flaps, airbrake and shafts',()=>{
 const s=defaultAircraftSystems();assert.deepEqual(validateAircraftSystems(s),[]);
 assert.equal(s.gear.deployed,true);assert.equal(s.flaps.position,0);
});
test('V6 key actions are edge triggered and flaps cycle safely',()=>{
 const s=defaultAircraftSystems();
 stepAircraftSystems(s,'airplane',new Set(['g','x','b']),1/60,.8);
 assert.equal(s.gear.deployed,false);assert.equal(s.airbrake.deployed,true);assert.equal(s.flaps.position,.25);
 stepAircraftSystems(s,'airplane',new Set(['g','x','b']),1/60,.8);
 assert.equal(s.gear.deployed,false);assert.equal(s.flaps.position,.25);
 for(let i=0;i<4;i++){stepAircraftSystems(s,'airplane',new Set(),1/60,.8);stepAircraftSystems(s,'airplane',new Set(['b']),1/60,.8)}
 assert.equal(s.flaps.position,0);
});
test('V6 flaps increase lift and drag, gear and airbrake add drag',()=>{
 const s=defaultAircraftSystems();const neutral=aircraftAeroModifiers(s,'airplane');
 s.flaps.position=1;s.airbrake.deployed=true;const active=aircraftAeroModifiers(s,'airplane');
 assert.ok(active.extraLift>neutral.extraLift);assert.ok(active.extraDrag>neutral.extraDrag);
 assert.equal(aircraftAeroModifiers(s,'helicopter').extraLift,0);
});
test('V6 rotor angle advances with collective but never teleports the scene',()=>{
 const s=defaultAircraftSystems();const a=stepAircraftSystems(s,'helicopter',new Set(),1/60,1).rotor.angle;
 assert.ok(a>0);assert.equal(s.propeller.angle,0);
 stepAircraftSystems(s,'helicopter',new Set(['b']),1/60,1);
 assert.equal(s.flaps.position,0);
});
test('V6 invalid configurations are rejected without NaN propagation',()=>{
 const s=defaultAircraftSystems();s.flaps.position=2;
 assert.ok(validateAircraftSystems(s).length>0);assert.equal(aircraftAeroModifiers(s,'airplane').extraDrag,0);
});
