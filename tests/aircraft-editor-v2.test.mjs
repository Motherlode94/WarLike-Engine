import test from 'node:test';
import assert from 'node:assert/strict';
import {componentChoices,addObjectComponent,removeObjectComponent,componentRemovalBlockers} from '../js/core/component-definitions.js';
import {componentMenuPath} from '../js/ui/component-menu-tree.js';
import {genericComponentDefinitions} from '../js/ui/generic-component-inspector.js';
import {defaultHelicopterPhysics} from '../js/core/aircraft-flight-physics.js';
import {validateAircraftActor} from '../js/core/aircraft-rapier.js';
import {canonicalScene,runtimeEntities} from '../js/core/scene-contract.js';
import {playerModules} from '../js/core/player-modules.js';
import {readFileSync} from 'node:fs';
const object=()=>({id:17,type:'mesh3d',name:'Plane',x:0,y:0,w:192,h:64,depth3d:250,elevation3d:2,color:'#456789'});
test('Aircraft Physics is a native 3D-only component in Vehicles / Aircraft',()=>{
 const option=componentChoices('3d').find(c=>c.id==='aircraftPhysics');
 assert.ok(option);
 assert.deepEqual(componentMenuPath(option,'Vehicles'),['Vehicles','Aircraft']);
 assert.equal(componentChoices('2d').some(c=>c.id==='aircraftPhysics'),false);
});
test('adding Aircraft Physics creates dynamic unlocked Rigidbody and collider',()=>{
 const e=object();
 assert.equal(addObjectComponent(e,'aircraftPhysics','3d'),true);
 assert.equal(e.aircraftPhysics.kind,'airplane');
 assert.equal(e.rigidbody3d.enabled,true);
 assert.equal(e.rigidbody3d.kinematic,false);
 assert.equal(e.rigidbody3d.lockRotations,false);
 assert.equal(e.rigidbody3d.mass,e.aircraftPhysics.mass);
 assert.equal(e.collider3d.enabled,true);
 assert.equal(e.collision3d,true);
 assert.deepEqual(validateAircraftActor(e),[]);
 assert.ok(genericComponentDefinitions(e,'3d').some(c=>c.id==='aircraftPhysics'));
 assert.ok(componentRemovalBlockers(e,'rigidbody3d').includes('aircraftPhysics'));
 assert.equal(removeObjectComponent(e,'rigidbody3d'),false);
});
test('airplane and helicopter configs survive canonical save/load',()=>{
 const e=object();
 addObjectComponent(e,'aircraftPhysics','3d');
 e.aircraftPhysics={...defaultHelicopterPhysics(),enabled:true};
 e.rigidbody3d.mass=e.aircraftPhysics.mass;
 e.aircraftInput={collective:.6,pitch:.2};
 e.aircraftWind={x:1,y:0,z:0};
 const copy=runtimeEntities(canonicalScene([e]))[0];
 assert.deepEqual(copy.aircraftPhysics,e.aircraftPhysics);
 assert.deepEqual(copy.aircraftInput,e.aircraftInput);
 assert.deepEqual(copy.aircraftWind,e.aircraftWind);
});
test('Web standalone closure contains both aircraft modules',()=>{
 const manifest=JSON.parse(readFileSync(new URL('../runtime-files.json',import.meta.url),'utf8'));
 for(const path of ['js/core/aircraft-flight-physics.js','js/core/aircraft-rapier.js']){
  assert.ok(manifest.files.includes(path),path+' missing in runtime-files');
  assert.ok(playerModules.includes(path),path+' missing in Player modules');
 }
});
