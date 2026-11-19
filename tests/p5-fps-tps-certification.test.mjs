import test from 'node:test';
import assert from 'node:assert/strict';
import {p5CertificationScene} from './p5-fps-tps-certification-fixture.mjs';
import {prepareGameDefinition} from '../js/core/game-build.js';
import {canonicalScene,runtimeEntities} from '../js/core/scene-contract.js';
import {stepNavigationAgents} from '../js/core/navigation-agent.js';
import {inspectRuntimeCompatibility} from '../js/core/runtime-capabilities.js';
import {cameraFacingDegrees} from '../js/core/character-facing.js';
import {facingVector3d,targetInFacingArc3d} from '../js/core/look-direction.js';
import {cameraRelativeWalk3d} from '../js/core/gameplay-components.js';

for(const mode of ['firstPerson','thirdPerson']) {
  test('P5 '+mode+': native playable scene, physic obstacles and real components',()=>{
    const fixture=p5CertificationScene(mode);
    const entities=fixture.entities;
    const player=entities.find(o=>o.id===fixture.ids.player);
    const moving=entities.find(o=>o.id===fixture.ids.movingTarget);
    assert.equal(fixture.mode,'3d');
    assert.equal(player.cameraRig.mode,mode);
    assert.ok(player.controller3d && player.animatorGraph);
    assert.ok(moving.navigationAgent && moving.animatorGraph);
    assert.ok(entities.some(o=>o.name==='Sol réel' && o.collision3d));
    assert.ok(entities.some(o=>o.name.startsWith('Mur ') && o.solid3d));
    assert.ok(entities.some(o=>o.name==='Porte du palier' && o.sequence));
    assert.equal(new Set(entities.map(o=>o.id)).size,entities.length);
    assert.equal(moving.ai,undefined,'Navigation and combat AI must not drive the same target');
    assert.deepEqual(inspectRuntimeCompatibility(entities).filter(x=>x.severity==='error'),[]);
  });

  test('P5 '+mode+': authored scene survives canonical save, reload and export untouched',()=>{
    const scene=p5CertificationScene(mode);
    const authored=structuredClone(scene.entities);
    const canonical=canonicalScene(scene.entities);
    const restored=runtimeEntities(canonical);
    const player=restored.find(o=>o.id===scene.ids.player);
    const moving=restored.find(o=>o.id===scene.ids.movingTarget);
    assert.equal(player.cameraRig.mode,mode);
    assert.equal(player.animatorGraph.entry,'motion');
    assert.deepEqual(moving.navigationAgent.waypoints,authored.find(o=>o.id===moving.id).navigationAgent.waypoints);
    const exported=prepareGameDefinition(scene);
    assert.equal(exported.format,'warlike.game.v1');
    assert.equal(exported.mode,'3d');
    const exportScene=exported.project.scenes.find(s=>s.id===exported.project.activeSceneId);
    assert.ok(exportScene);
    assert.deepEqual(exportScene.entities,authored);
    assert.deepEqual(scene.entities,authored,'Export must not mutate the authored scene');
    assert.equal(exported.sceneContracts.length,exported.project.scenes.length);
  });

  test('P5 '+mode+': movement, directional aim and Animator navigation output agree',()=>{
    const scene=p5CertificationScene(mode);
    const entities=structuredClone(scene.entities);
    const p=entities.find(o=>o.id===scene.ids.player);
    const moving=entities.find(o=>o.id===scene.ids.movingTarget);
    const startX=moving.x;
    const moved=stepNavigationAgents(entities,1/60,{mode:'3d'});
    assert.ok(moved>=1,'Navigation Agent must move a live GameObject');
    assert.ok(moving.x>startX,'Moving target follows its first waypoint');
    assert.ok(moving.animatorParameters.navigationSpeed>0);
    assert.equal(moving.animatorParameters.navigationMoving,true);
    assert.equal(moving.animation,'walk');
    for(const yaw of [0,Math.PI/2,Math.PI,3*Math.PI/2]) {
      p.rotation=cameraFacingDegrees(yaw);
      const facing=facingVector3d(p),walk=cameraRelativeWalk3d(0,1,yaw);
      assert.ok(Math.abs(facing.x-walk.x)<1e-7);
      assert.ok(Math.abs(facing.y-walk.z)<1e-7);
      const front={x:p.x+facing.x*128,y:p.y+facing.y*128,w:p.w,depth3d:p.depth3d};
      const back={x:p.x-facing.x*128,y:p.y-facing.y*128,w:p.w,depth3d:p.depth3d};
      assert.equal(targetInFacingArc3d(p,front,1.2),true);
      assert.equal(targetInFacingArc3d(p,back,1.2),false);
    }
  });
}
test('P5 rejects unsupported view modes instead of silently changing gameplay',()=>{
  assert.throws(()=>p5CertificationScene('editor'),/Unsupported P5 camera mode/);
});
