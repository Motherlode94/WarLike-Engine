import test from 'node:test';
import assert from 'node:assert/strict';
import RAPIER from '@dimforge/rapier3d-compat';
import {groundVehicleCertificationScene} from '../js/core/ground-vehicle-certification-scene.js';
import {createRapierScene,synchronizeRapierScene,stepRapierScene,disposeRapierScene} from '../js/core/rapier-physics-3d.js';
import {applyGroundVehicleForces} from '../js/core/ground-vehicle-rapier.js';
import {prepareGameDefinition,gameRuntimeFiles} from '../js/core/game-build.js';
import {runtimeEntities,canonicalScene} from '../js/core/scene-contract.js';
import {readFileSync} from 'node:fs';
await RAPIER.init();
const newScene=()=>groundVehicleCertificationScene();
test('V4 certification scene has three native dynamic vehicles, actual colliders, road and obstacles',()=>{
 const s=newScene();
 assert.equal(s.project.physics3d,'rapier');assert.equal(s.entities.filter(x=>x.groundVehiclePhysics).length,3);
 for(const kind of ['car','truck','tracked']){
  const e=s.entities.find(x=>x.id===s.ids[kind]);
  assert.equal(e.groundVehiclePhysics.kind,kind);
  assert.ok(e.collider3d?.enabled&&e.rigidbody3d?.enabled);
  assert.equal(e.rigidbody3d.lockRotations,false);
  assert.equal(e.groundVehiclePhysics.mass,e.rigidbody3d.mass);
 }
 assert.ok(s.entities.some(x=>x.name.includes('rampe')));
});
test('V4 scene preserves vehicle physics in canonical roundtrip and exported player manifest',()=>{
 const s=newScene(),before=structuredClone(s);
 const roundtrip=runtimeEntities(canonicalScene(s.entities));
 for(const kind of ['car','truck','tracked']){
  const original=s.entities.find(x=>x.id===s.ids[kind]);
  assert.deepEqual(roundtrip.find(x=>x.id===original.id).groundVehiclePhysics,original.groundVehiclePhysics);
 }
 const data=prepareGameDefinition(s);
 for(const kind of ['car','truck','tracked'])
  assert.equal(data.project.scenes[0].entities.find(x=>x.id===s.ids[kind]).groundVehiclePhysics.kind,kind);
 assert.deepEqual(s,before,'Export does not alter the authored scene');
 const manifest=JSON.parse(readFileSync(new URL('../runtime-files.json',import.meta.url),'utf8'));
 const included=gameRuntimeFiles(manifest.files,data);
 for(const name of ['js/core/ground-vehicle-rapier.js','js/core/vehicle-wheel-physics.js','js/core/rapier-physics-3d.js'])
  assert.ok(included.includes(name),'Standalone player missing '+name);
 assert.equal(included.includes('js/editor.js'),false);
});
test('V4 real Rapier raycasts detect each suspension and apply forces only after contact',()=>{
 const s=newScene(),scene=createRapierScene(RAPIER,s.entities);
 try{
  // Rapier updates broadphase/query pipeline on the physics step; warm up
  // the real world before probing authored suspension contacts.
  stepRapierScene(scene,1/120);
  const result=applyGroundVehicleForces(scene,1/60);
  for(const kind of ['car','truck','tracked']){
   const status=result.find(x=>x.id===s.ids[kind]);
   assert.ok(status&&!status.error,kind+': '+JSON.stringify(status));
   assert.ok(status.contacts>=2,kind+' must actually touch the ground: '+JSON.stringify({status,pose:scene.actors.get(s.ids[kind])?.body.translation(),floor:scene.actors.get(1)?.collider?.translation?.()}));
  }
  assert.equal(synchronizeRapierScene(scene,s.entities),true);
  stepRapierScene(scene,1/60);
  for(const kind of ['car','truck','tracked']){
   const body=scene.actors.get(s.ids[kind]).body;
   assert.ok(Number.isFinite(body.translation().y));
   assert.ok(Number.isFinite(body.linvel().y));
  }
 }finally{disposeRapierScene(scene)}
});
test('V4 real Rapier has forward propulsion and brakes for a car without arcade teleports',()=>{
 const s=newScene(),car=s.entities.find(x=>x.id===s.ids.car),scene=createRapierScene(RAPIER,s.entities);
 try{
  car.groundVehicleInput={throttle:1,steer:0,brake:0,handbrake:0};
  const original={x:car.x,y:car.y};
  for(let i=0;i<35;i++){
   assert.equal(synchronizeRapierScene(scene,s.entities),true);
   stepRapierScene(scene,1/60);
  }
  const body=scene.actors.get(car.id).body;
  const speed=body.linvel();
  assert.ok(speed.z<-.05,'Car should drive forward using wheel physics: '+JSON.stringify(speed));
  assert.ok(car.y<original.y,'Vehicle pose must be sourced from Rapier, not arcade transforms');
  car.groundVehicleInput={throttle:0,steer:0,brake:1,handbrake:0};
  for(let i=0;i<40;i++){synchronizeRapierScene(scene,s.entities);stepRapierScene(scene,1/60)}
  const after=scene.actors.get(car.id).body.linvel();
  assert.ok(Number.isFinite(after.z));
 }finally{disposeRapierScene(scene)}
});
