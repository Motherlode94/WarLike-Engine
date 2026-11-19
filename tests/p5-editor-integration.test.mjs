import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {p5CertificationScene} from '../js/core/p5-certification-scene.js';
import {canonicalScene,runtimeEntities} from '../js/core/scene-contract.js';
import {inspectRuntimeCompatibility} from '../js/core/runtime-capabilities.js';
import {get3dAsset} from '../js/assets/catalog-3d.js';
import {prepareGameDefinition} from '../js/core/game-build.js';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('P5 FPS/TPS are registered as native, editable Engine demo scenes',()=>{
 const scene=read('js/core/scene.js'),browser=read('js/ui/demo-browser.js');
 assert.match(scene,/import \{p5CertificationScene\} from '\.\/p5-certification-scene\.js'/);
 for(const [id,mode] of [['p5fps','firstPerson'],['p5tps','thirdPerson']]){
  assert.ok(scene.includes("p5CertificationScene('"+mode+"')"));
  assert.ok(browser.includes("id:'"+id+"'"));
  assert.ok(browser.includes("mode:'3d'"));
 }
 assert.match(scene,/record\('Avant changement de scène démo'\)/);
 assert.match(scene,/Object\.assign\(state,\{entities:demo\.entities,selected:demo\.selected,nextId:demo\.nextId,demoGuide:demo\.guide\}\)/);
});

for(const mode of ['firstPerson','thirdPerson']){
 test('P5 '+mode+' loads a complete editable scene without a test-only runtime dependency',()=>{
  const scene=p5CertificationScene(mode),hero=scene.entities.find(o=>o.id===scene.ids.player);
  assert.equal(scene.mode,'3d');
  assert.equal(scene.selected[0],hero.id);
  assert.equal(scene.nextId,Math.max(...scene.entities.map(o=>o.id))+1);
  assert.equal(hero.cameraRig.mode,mode);
  assert.ok(scene.guide.includes('Inspector'));
  assert.equal(new Set(scene.entities.map(o=>o.id)).size,scene.entities.length);
  assert.ok(scene.entities.every(o=>o.hierarchyGroup||o.name),'Every GameObject must remain accessible in Hierarchy');
  assert.ok(scene.entities.some(o=>o.navigationAgent&&o.animatorGraph));
  for(const o of scene.entities)if(o.model3dId)assert.ok(get3dAsset(o.model3dId),'Unknown GLB '+o.model3dId);
  assert.deepEqual(inspectRuntimeCompatibility(scene.entities).filter(x=>x.severity==='error'),[]);
  const authored=structuredClone(scene.entities);
  const restored=runtimeEntities(canonicalScene(scene.entities));
  assert.equal(restored.find(o=>o.id===hero.id).cameraRig.mode,mode);
  const game=prepareGameDefinition(scene);
  assert.deepEqual(game.project.scenes.find(s=>s.id===game.project.activeSceneId).entities,authored);
  assert.deepEqual(scene.entities,authored,'Editor generator cannot mutate data during Web preparation');
 });
}
