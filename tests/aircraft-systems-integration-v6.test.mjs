import test from 'node:test';
import assert from 'node:assert/strict';
import {addObjectComponent,removeObjectComponent,componentChoices,componentRemovalBlockers} from '../js/core/component-definitions.js';
import {componentMenuPath} from '../js/ui/component-menu-tree.js';
import {defaultAircraftSystems,aircraftAeroModifiers,stepAircraftSystems} from '../js/core/aircraft-systems.js';
import {defaultAirplanePhysics,solveAircraftForces} from '../js/core/aircraft-flight-physics.js';
import {canonicalScene,runtimeEntities} from '../js/core/scene-contract.js';
import {readFileSync} from 'node:fs';
import {playerModules} from '../js/core/player-modules.js';

test('Aircraft Systems component creates required Rapier chassis in 3D and preserves it on reload',()=>{
 const e={id:11,name:'Aircraft',type:'mesh3d',x:0,y:0,w:200,h:75,depth3d:230};
 const opt=componentChoices('3d').find(x=>x.id==='aircraftSystems');
 assert.ok(opt);
 assert.deepEqual(componentMenuPath(opt,'Vehicles'),['Vehicles','Aircraft']);
 assert.equal(componentChoices('2d').some(x=>x.id==='aircraftSystems'),false);
 assert.equal(addObjectComponent(e,'aircraftSystems','3d'),true);
 assert.equal(e.aircraftPhysics.kind,'airplane');
 assert.equal(e.rigidbody3d.enabled,true);
 assert.equal(e.rigidbody3d.kinematic,false);
 assert.equal(e.rigidbody3d.lockRotations,false);
 assert.equal(e.rigidbody3d.mass,e.aircraftPhysics.mass);
 assert.ok(e.collider3d.enabled);
 assert.ok(componentRemovalBlockers(e,'aircraftPhysics').includes('aircraftSystems'));
 assert.equal(removeObjectComponent(e,'aircraftPhysics'),false);
 assert.deepEqual(runtimeEntities(canonicalScene([e]))[0].aircraftSystems,e.aircraftSystems);
});
test('V6 actual aerodynamic solver modifies lift/drag without changing default V5 flight',()=>{
 const base=defaultAirplanePhysics(),velocity={x:0,y:0,z:-65};
 const baseline=solveAircraftForces({config:base,velocity});
 const s=defaultAircraftSystems();
 const configured=solveAircraftForces({config:base,velocity,systems:s});
 assert.ok(configured.drag>baseline.drag);
 assert.ok(configured.lift>=baseline.lift);
 s.flaps.position=1;
 const flaps=solveAircraftForces({config:base,velocity,systems:s});
 assert.ok(flaps.lift>configured.lift,'Flaps must generate additional lift through native solver');
 assert.ok(flaps.drag>configured.drag,'Flaps must increase drag through native solver');
 s.airbrake.deployed=true;
 assert.ok(solveAircraftForces({config:base,velocity,systems:s}).drag>flaps.drag);
});
test('V6 existing flight profile and empty aircraft systems remain compatible',()=>{
 const config=defaultAirplanePhysics(),velocity={x:0,y:0,z:-55};
 assert.deepEqual(solveAircraftForces({config,velocity}),solveAircraftForces({config,velocity,systems:null}));
 assert.deepEqual(aircraftAeroModifiers(null,'airplane'),{extraDrag:0,extraLift:0});
});
test('V6 systems respond to actual piloting controls in runtime; Play HUD is wired',()=>{
 const src=readFileSync(new URL('../js/core/vehicle-3d.js',import.meta.url),'utf8');
 const hud=readFileSync(new URL('../js/core/viewport-3d.js',import.meta.url),'utf8');
 assert.match(src,/stepAircraftSystems\(drivingCar\.aircraftSystems,/);
 assert.match(hud,/aircraft\.aircraftSystems\.flaps\.position/);
 const s=defaultAircraftSystems();stepAircraftSystems(s,'airplane',new Set(['b','x','g']),.1,1);
 assert.equal(s.flaps.position,.25);assert.equal(s.gear.deployed,false);
});
test('V6 export closure includes aircraft systems in Web Player',()=>{
 const manifest=JSON.parse(readFileSync(new URL('../runtime-files.json',import.meta.url),'utf8'));
 for(const file of ['js/core/aircraft-systems.js']){
  assert.ok(manifest.files.includes(file),'Missing runtime file '+file);
  assert.ok(playerModules.includes(file),'Missing player file '+file);
 }
 assert.ok(!playerModules.includes('js/editor.js'));
});
