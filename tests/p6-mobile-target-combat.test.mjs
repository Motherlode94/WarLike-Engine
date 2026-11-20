import test from 'node:test';
import assert from 'node:assert/strict';
import {p5CertificationScene} from '../js/core/p5-certification-scene.js';
import {defaultStats,damage} from '../js/core/gameplay-components.js';
import {stepNavigationAgents} from '../js/core/navigation-agent.js';
import {prepareGameDefinition} from '../js/core/game-build.js';

for(const camera of ['firstPerson','thirdPerson']){
 test('P5 '+camera+' moving target has native health, separate navigation and exportable damage state',()=>{
  const scene=p5CertificationScene(camera);
  const target=scene.entities.find(e=>e.id===scene.ids.movingTarget);
  assert.equal(target.ai,undefined,'Combat AI must not steal navigation steering');
  assert.deepEqual(target.stats,defaultStats());
  assert.ok(target.navigationAgent?.enabled);
  const initialX=target.x;
  const count=stepNavigationAgents(scene.entities,1/60,{mode:'3d'});
  assert.ok(count>=1,'Navigation Agent must advance target');
  assert.notEqual(target.x,initialX);
  assert.equal(target.animatorParameters.navigationMoving,true);
  const remaining=damage(target,25);
  assert.equal(remaining,75,'Target must be damageable when a real FPS/TPS hit lands');
  assert.equal(target.stats.health,75);
  const definition=prepareGameDefinition(scene);
  const exported=definition.project.scenes.find(s=>s.id===definition.project.activeSceneId);
  assert.equal(exported.entities.find(e=>e.id===target.id).stats.health,75);
  assert.equal(exported.entities.find(e=>e.id===target.id).cameraRig,undefined);
 });
}
