import test from 'node:test';
import assert from 'node:assert/strict';
import {createScene,createGameObject,addGameObject} from '../js/core/scene-graph-v2.js';
import {createProject,attachScene,validateProject,exportProject,importProject} from '../js/core/project-format-v2.js';
test('project V2 stores multiple scenes and roundtrips without asset binaries',()=>{
 const p=createProject('WarLike','3d'),a=createScene('Menu'),b=createScene('Level');
 addGameObject(b,createGameObject('Soldier','soldier'));
 attachScene(p,a);attachScene(p,b);p.assets.push({id:'soldier-model',path:'Assets/soldier.glb'});
 assert.equal(p.settings.startSceneId,a.id);
 assert.deepEqual(importProject(exportProject(p)),p);
});
test('missing startup scene and duplicate asset names are rejected',()=>{
 const p=createProject();p.settings.startSceneId='missing';
 assert.ok(validateProject(p).some(e=>e.includes('initiale')));
 p.settings.startSceneId=null;p.assets=[{id:'duplicate'},{id:'duplicate'}];
 assert.throws(()=>exportProject(p),/dupliqué/);
});
