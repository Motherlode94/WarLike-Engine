import test from 'node:test';
import assert from 'node:assert/strict';
import {createScene,createGameObject,addGameObject} from '../js/core/scene-graph-v2.js';
import {createSceneHistory,setComponentProperty,renameGameObject} from '../js/core/scene-commands-v2.js';
test('undo, redo and independent scene snapshots',()=>{
 const scene=createScene();addGameObject(scene,createGameObject('Soldier','soldier'));
 const history=createSceneHistory(scene);
 history.commit('Move',next=>setComponentProperty(next,'soldier','Transform','position',[10,2,3]));
 assert.deepEqual(history.scene.objects[0].components[0].position,[10,2,3]);
 const leaked=history.scene;leaked.objects[0].components[0].position[0]=999;
 assert.equal(history.scene.objects[0].components[0].position[0],10);
 assert.deepEqual(history.undo().objects[0].components[0].position,[0,0,0]);
 assert.deepEqual(history.redo().objects[0].components[0].position,[10,2,3]);
});
test('invalid changes rollback and branching clears redo',()=>{
 const scene=createScene();addGameObject(scene,createGameObject('Object','one'));
 const history=createSceneHistory(scene);
 assert.throws(()=>history.commit('Invalid',next=>setComponentProperty(next,'one','Transform','scale',[0,1,1])),/annulée/);
 assert.equal(history.length,1);
 history.commit('Rename',next=>renameGameObject(next,'one','A'));
 history.undo();history.commit('Branch',next=>renameGameObject(next,'one','B'));
 assert.equal(history.canRedo,false);
 assert.equal(history.scene.objects[0].name,'B');
});
test('bounded history retains at most configured snapshots',()=>{
 const scene=createScene();addGameObject(scene,createGameObject('Object','one'));
 const history=createSceneHistory(scene,{limit:3});
 for(let n=0;n<7;n++)history.commit('Rename '+n,next=>renameGameObject(next,'one','Name '+n));
 assert.equal(history.length,3);
 assert.equal(history.index,2);
});
