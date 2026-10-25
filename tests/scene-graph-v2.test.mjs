import test from 'node:test';
import assert from 'node:assert/strict';
import {createScene,createGameObject,addGameObject,addComponent,reparent,validateScene,serializeScene,deserializeScene,duplicateGameObject,removeGameObject} from '../js/core/scene-graph-v2.js';
test('create, serialize and restore a versioned scene with components',()=>{
 const scene=createScene('Prototype');
 const player=addGameObject(scene,createGameObject('Player','player'));
 player.components[0].position=[1,2,3];
 addComponent(player,{type:'MeshRenderer',assetId:'soldier'});
 const saved=serializeScene(scene),restored=deserializeScene(saved);
 assert.deepEqual(restored,scene);
 assert.equal(restored.objects[0].components[1].assetId,'soldier');
});
test('reject duplicate IDs and invalid transforms',()=>{
 const scene=createScene();addGameObject(scene,createGameObject('One','one'));
 assert.throws(()=>addGameObject(scene,createGameObject('Other','one')),/double/);
 scene.objects[0].components[0].position=[NaN,0,0];
 assert.ok(validateScene(scene).some(e=>e.includes('position')));
 assert.throws(()=>serializeScene(scene),/position/);
});
test('reject hierarchy cycles and cascade deletion to children',()=>{
 const scene=createScene();
 addGameObject(scene,createGameObject('Parent','a'));
 addGameObject(scene,createGameObject('Child','b'),'a');
 assert.throws(()=>reparent(scene,'a','b'),/cyclique/);
 const duplicate=duplicateGameObject(scene,'b');
 assert.notEqual(duplicate.id,'b');
 assert.equal(removeGameObject(scene,'a'),3);
 assert.equal(scene.objects.length,0);
});
