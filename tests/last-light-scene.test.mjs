import test from 'node:test';
import assert from 'node:assert/strict';
import {createLastLightScene} from '../js/core/last-light-scene.js';
import {validEntities} from '../js/core/game-project.js';
test('THE LAST LIGHT is a valid editable 3D game scene with protagonist and infecteds',()=>{
 const scene=createLastLightScene('3d');
 assert.equal(scene.genre,'horror');
 assert.ok(scene.entities.length>20);
 assert.ok(validEntities(scene.entities));
 assert.ok(scene.entities.every(e=>e.type==='mesh3d'));
 assert.ok(scene.entities.some(e=>e.playable3d&&e.cameraRig.mode==='thirdPerson'));
 assert.equal(scene.entities.filter(e=>e.tags?.includes('last-light-infected')).length,3);
 assert.ok(scene.entities.some(e=>e.tags?.includes('ai-walkable')&&e.solid3d));
});
test('three evidence objects gate Iris, then two choice-dependent exits',()=>{
 const scene=createLastLightScene('3d');
 const clues=scene.entities.filter(e=>e.tags?.includes('last-light-clue'));
 assert.equal(clues.length,3);
 assert.ok(clues.every(e=>e.sequence.event==='interact'));
 const iris=scene.entities.find(e=>e.name==='Iris · éclaireuse');
 assert.equal(iris.sequence.conditions.length,4);
 assert.equal(iris.sequences.length,2);
 const exit=scene.entities.find(e=>e.name==='Porte · station de transit');
 assert.equal(exit.sequence.branches.length,2);
 assert.throws(()=>createLastLightScene('2d'),/3D/);
});
