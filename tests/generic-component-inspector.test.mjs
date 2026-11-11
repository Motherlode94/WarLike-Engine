import test from 'node:test';
import assert from 'node:assert/strict';
import {componentChoices,addObjectComponent,removeObjectComponent,resetObjectComponent} from '../js/core/component-definitions.js';
import {genericComponentDefinitions} from '../js/ui/generic-component-inspector.js';
import {commonInspectorFields,inspectValue,setInspectorValue} from '../js/core/inspector-model.js';
import {canonicalScene,runtimeEntities} from '../js/core/scene-contract.js';
import {prepareGameDefinition} from '../js/core/game-build.js';
import {freshGameProject} from '../js/core/game-project.js';

const entity=()=>({id:1,name:'Guard',type:'mesh3d',x:20,y:30,w:64,h:96,depth3d:64,color:'#8195ef'});
test('every registered fallback component is visible and addable in the correct mode',()=>{
 const actor=entity();
 const expected=['horrorAiConfig','horrorHideConfig','horrorFearConfig','worldPoliceConfig','worldInfectedConfig'];
 for(const id of expected){
  assert.ok(componentChoices('3d').some(d=>d.id===id),id+' must be a registered component');
  assert.equal(addObjectComponent(actor,id,'3d'),true);
 }
 const found=genericComponentDefinitions(actor,'3d');
 assert.deepEqual(found.map(x=>x.id).sort(),expected.sort());
 assert.ok(found.every(x=>typeof actor[x.id]==='object'));
});
test('Inspector primitive edits survive scene serialization, game export and component removal',()=>{
 const actor=entity();actor.playable3d=true;
 assert.equal(addObjectComponent(actor,'horrorAiConfig','3d'),true);
 const paths=commonInspectorFields([actor.horrorAiConfig]);
 assert.ok(paths.some(p=>p.join('.')==='visionRange'));
 assert.ok(paths.some(p=>p.join('.')==='enabled'));
 assert.equal(setInspectorValue([actor.horrorAiConfig],['visionRange'],312),true);
 assert.equal(setInspectorValue([actor.horrorAiConfig],['enabled'],false),true);
 assert.equal(inspectValue(actor,['horrorAiConfig','visionRange']),312);
 const restored=runtimeEntities(canonicalScene([actor]));
 assert.deepEqual(restored[0].horrorAiConfig,actor.horrorAiConfig);
 const original=structuredClone(actor);
 const build=prepareGameDefinition({entities:[actor],mode:'3d',project:{...freshGameProject(),runtimeBackend:'web'}});
 assert.equal(build.project.scenes[0].entities[0].horrorAiConfig.visionRange,312);
 assert.deepEqual(actor,original,'build may not mutate authored Inspector values');
 assert.equal(resetObjectComponent(actor,'horrorAiConfig'),true);
 assert.notEqual(actor.horrorAiConfig.visionRange,312);
 assert.equal(removeObjectComponent(actor,'horrorAiConfig'),true);
 assert.equal(Object.hasOwn(actor,'horrorAiConfig'),false);
});
test('no generic Inspector fallback is duplicated for a component with a dedicated panel',()=>{
 const actor=entity();
 assert.equal(addObjectComponent(actor,'collider3d','3d'),true);
 assert.equal(addObjectComponent(actor,'horrorFearConfig','3d'),true);
 assert.equal(genericComponentDefinitions(actor,'3d',['horrorFearConfig']).length,0);
 assert.equal(genericComponentDefinitions(actor,'3d').some(x=>x.id==='collider3d'),false);
});
