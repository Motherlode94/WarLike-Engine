import test from 'node:test';import assert from 'node:assert/strict';
import {componentChoices,addObjectComponent,removeObjectComponent,resetObjectComponent,inspectorComponentRank} from '../js/core/component-definitions.js';
test('component browser offers existing Web runtime components with correct 2D/3D scope',()=>{
 assert.ok(!componentChoices('2d').some(d=>d.id==='rigidbody3d'));assert.ok(componentChoices('3d').some(d=>d.id==='rigidbody3d'));assert.ok(componentChoices('2d').some(d=>d.id==='cameraRig'));
});
test('adding or resetting one installed component preserves unrelated object data',()=>{
 const actor={name:'Hero',x:120,stats:{health:12},inventory:{items:[{id:'key',count:1}]}};assert.equal(addObjectComponent(actor,'stats','2d'),false);assert.equal(actor.stats.health,12);assert.equal(addObjectComponent(actor,'ai','2d'),true);assert.ok(actor.ai.enabled);assert.equal(resetObjectComponent(actor,'stats'),true);assert.equal(actor.stats.health,100);assert.deepEqual(actor.inventory.items,[{id:'key',count:1}]);assert.equal(removeObjectComponent(actor,'ai'),true);assert.equal(actor.ai,undefined);assert.equal(addObjectComponent(actor,'unknown','2d'),false);
});
test('one component browser can attach independent Blueprint behaviors up to the runtime limit',()=>{
 const actor={};for(let i=0;i<33;i++)assert.equal(addObjectComponent(actor,'sequence','2d'),true);assert.equal(addObjectComponent(actor,'sequence','2d'),false);assert.equal(actor.sequences.length,32);assert.notEqual(actor.sequence,actor.sequences[0]);const original=structuredClone(actor.sequences[0].instructions);actor.sequence.instructions.push({type:'message',value:'Hello'});assert.deepEqual(actor.sequences[0].instructions,original);
});
test('Inspector orders transform and rendering before physics and behaviors',()=>{
 const titles=['Blueprint','Stats','Rigidbody','Sprite Renderer','Transform'];titles.sort((a,b)=>inspectorComponentRank(a)-inspectorComponentRank(b));assert.deepEqual(titles,['Transform','Sprite Renderer','Rigidbody','Stats','Blueprint']);
});
