import test from 'node:test';
import assert from 'node:assert/strict';
import {p5CertificationScene} from '../js/core/p5-certification-scene.js';
import {canonicalScene,runtimeEntities} from '../js/core/scene-contract.js';
import {prepareGameDefinition} from '../js/core/game-build.js';
import {inspectRuntimeCompatibility} from '../js/core/runtime-capabilities.js';

const authored=mode=>{
 const p=p5CertificationScene(mode);
 const hero=p.entities.find(e=>e.id===p.ids.player);
 const moving=p.entities.find(e=>e.id===p.ids.movingTarget);
 const door=p.entities.find(e=>e.id===p.ids.door);
 // Simulate actual Inspector-editable component properties. These changes
 // must not be replaced by defaults on serialization or exported packaging.
 hero.controller3d.walkSpeed=4.75;
 hero.cameraRig.collision=true;
 hero.animatorGraph.states.find(s=>s.id==='motion').speed=1.35;
 moving.navigationAgent.speed=1.75;
 moving.navigationAgent.waypoints=[{x:100,y:-120},{x:76,y:-120}];
 door.color='#64748b';
 door.collision3d=true;
 return p;
};
for (const mode of ['firstPerson','thirdPerson']) {
 test('P7 '+mode+': Inspector component edits survive scene save, reopening and Web export',()=>{
  const fixture=authored(mode);
  const source=structuredClone(fixture.entities);
  const scene=canonicalScene(fixture.entities,{id:'p7',name:'P7 certification'});
  const reopened=runtimeEntities(scene);
  const hero=reopened.find(e=>e.id===fixture.ids.player);
  const moving=reopened.find(e=>e.id===fixture.ids.movingTarget);
  const door=reopened.find(e=>e.id===fixture.ids.door);
  assert.equal(hero.cameraRig.mode,mode);
  assert.equal(hero.controller3d.walkSpeed,4.75);
  assert.equal(hero.animatorGraph.states.find(s=>s.id==='motion').speed,1.35);
  assert.equal(moving.navigationAgent.speed,1.75);
  assert.deepEqual(moving.navigationAgent.waypoints,[{x:100,y:-120},{x:76,y:-120}]);
  assert.equal(door.color,'#64748b');
  assert.equal(door.collision3d,true);
  assert.deepEqual(reopened,source);
  assert.deepEqual(inspectRuntimeCompatibility(reopened).filter(e=>e.severity==='error'),[]);
  const definition=prepareGameDefinition(fixture);
  const exported=definition.project.scenes.find(s=>s.id===definition.project.activeSceneId);
  assert.ok(exported);
  assert.deepEqual(exported.entities,source,'Export must faithfully preserve authored entities');
  assert.deepEqual(fixture.entities,source,'Export may not mutate the editor project');
 });
}
