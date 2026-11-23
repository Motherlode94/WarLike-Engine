import test from 'node:test';
import assert from 'node:assert/strict';
import RAPIER from '@dimforge/rapier3d-compat';
import {readFileSync} from 'node:fs';
import {aircraftCertificationScene} from '../js/core/aircraft-certification-scene.js';
import {createRapierScene,synchronizeRapierScene,stepRapierScene,disposeRapierScene} from '../js/core/rapier-physics-3d.js';
import {applyAircraftForces} from '../js/core/aircraft-rapier.js';
import {validateAircraftActor} from '../js/core/aircraft-rapier.js';
import {prepareGameDefinition,gameRuntimeFiles} from '../js/core/game-build.js';
import {canonicalScene,runtimeEntities} from '../js/core/scene-contract.js';
await RAPIER.init();
const make=kind=>aircraftCertificationScene(kind);
const tick=(scene,objects,frames=1)=>{
 for(let i=0;i<frames;i++){
  assert.equal(synchronizeRapierScene(scene,objects),true,'Dynamic Rapier world should remain persistent');
  stepRapierScene(scene,1/60);
 }
};
test('V5 airplane runway and helicopter heliport are editable, compatible native scenes',()=>{
 for(const kind of ['airplane','helicopter']){
  const s=make(kind),plane=s.entities.find(e=>e.id===s.ids.craft);
  assert.equal(s.project.physics3d,'rapier');
  assert.equal(s.entities.filter(e=>e.playable3d).length,1);
  assert.equal(plane.aircraftPhysics.kind,kind);
  assert.equal(plane.aircraftPhysics.mass,plane.rigidbody3d.mass);
  assert.equal(plane.rigidbody3d.lockRotations,false);
  assert.deepEqual(validateAircraftActor(plane),[]);
  assert.ok(s.entities.some(e=>e.id===s.ids.ground&&e.collision3d));
 }
});
test('V5 save, reopen and Web project export preserve both flight configurations',()=>{
 for(const kind of ['airplane','helicopter']){
  const s=make(kind),before=structuredClone(s);
  const canonical=canonicalScene(s.entities);
  const reopened=runtimeEntities(canonical),source=s.entities.find(e=>e.id===s.ids.craft);
  const recovered=reopened.find(e=>e.id===s.ids.craft);
  for(const key of ['aircraftPhysics','aircraftInput','aircraftCamera','aircraftWind','rigidbody3d'])
   assert.deepEqual(recovered[key],source[key],kind+' lost '+key);
  const built=prepareGameDefinition(s);
  assert.equal(built.project.scenes[0].entities.find(e=>e.id===s.ids.craft).aircraftPhysics.kind,kind);
  assert.deepEqual(s,before,'Export must not mutate source');
  const manifest=JSON.parse(readFileSync(new URL('../runtime-files.json',import.meta.url),'utf8'));
  const included=gameRuntimeFiles(manifest.files,built);
  for(const path of ['js/core/aircraft-rapier.js','js/core/aircraft-flight-physics.js','js/core/aircraft-pilot-input.js','js/core/aircraft-camera.js'])
   assert.ok(included.includes(path),'Standalone Web game must include '+path);
  assert.ok(!included.includes('js/editor.js'));
 }
});
test('V5 helicopter gains altitude from collective in the actual Rapier world',()=>{
 const s=make('helicopter'),craft=s.entities.find(e=>e.id===s.ids.craft);
 craft.aircraftInput.collective=1;
 const scene=createRapierScene(RAPIER,s.entities);
 try{
  assert.ok(scene.actors.has(craft.id),'Helicopter Rigidbody missing');
  const initial=scene.actors.get(craft.id).body.translation().y;
  const output=applyAircraftForces(scene,1/60).find(x=>x.id===craft.id);
  assert.ok(output&&!output.error,'Flight force rejected: '+JSON.stringify(output));
  assert.ok(output.thrust>0);
  tick(scene,s.entities,45);
  const body=scene.actors.get(craft.id).body;
  assert.ok(Number.isFinite(body.translation().y)&&Number.isFinite(body.linvel().y));
  assert.ok(body.translation().y>initial+.2,'Collective must lift helicopter: '+JSON.stringify({start:initial,end:body.translation().y,velocity:body.linvel()}));
 }finally{disposeRapierScene(scene)}
});
test('V5 airplane has measurable real-Rapier high-speed lift, forward thrust and dynamic collisions',()=>{
 const s=make('airplane'),plane=s.entities.find(e=>e.id===s.ids.craft);
 plane.elevation3d=60;
 plane.rigidbody3d.vz=-140*64;
 plane.aircraftInput.throttle=.9;
 const scene=createRapierScene(RAPIER,s.entities);
 try{
  const before=scene.actors.get(plane.id).body.linvel();
  assert.ok(before.z< -100);
  const first=applyAircraftForces(scene,1/60).find(x=>x.id===plane.id);
  assert.ok(first&&!first.error,JSON.stringify(first));
  assert.ok(first.lift>0,'At positive forward airspeed and 0 angle of attack, positive wing camber produces lift');
  tick(scene,s.entities,8);
  const after=scene.actors.get(plane.id).body.linvel();
  assert.ok(after.z<before.z,'Engine thrust should accelerate the airplane along -Z');
  assert.ok(after.y> -2,'High-speed wing lift must resist gravity: '+JSON.stringify(after));
  assert.ok(Number.isFinite(plane.elevation3d));
 }finally{disposeRapierScene(scene)}
});
test('V5 zero helicopter collective produces gravity-driven descent without artificial hover',()=>{
 const s=make('helicopter'),heli=s.entities.find(e=>e.id===s.ids.craft);
 heli.elevation3d=12;heli.aircraftInput.collective=0;
 const scene=createRapierScene(RAPIER,s.entities);
 try{
  const start=scene.actors.get(heli.id).body.translation().y;
  tick(scene,s.entities,25);
  assert.ok(scene.actors.get(heli.id).body.translation().y<start-.25);
 }finally{disposeRapierScene(scene)}
});
