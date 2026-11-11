import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareGameDefinition,gameBuildHtml} from '../js/core/game-build.js';
import {freshGameProject} from '../js/core/game-project.js';
import {createChambre07Scene} from '../js/core/chambre-07-scene.js';

const actor=()=>({id:1,type:'mesh3d',name:'Hero',x:0,y:0,w:64,h:120,depth3d:64,playable3d:true,assetId:'character-hero'});
const scene=()=>({id:'other',name:'Another',camera:{x:0,y:0,zoom:1},entities:[actor()]});

test('legacy single-scene startup is repaired in exported clone, preserving original project',()=>{
 const project={...freshGameProject(),id:'legacy-horror',genre:'horror',activeSceneId:'main',startupSceneId:'retired-scene'};
 const before=structuredClone(project);
 const build=prepareGameDefinition({entities:[actor()],mode:'3d',project});
 assert.equal(build.project.startupSceneId,'main');
 assert.deepEqual(project,before);
 assert.equal(build.project.scenes.length,1);
 assert.ok(build.issues.some(issue=>issue.severity==='warning'&&issue.message.includes('retired-scene')));
});
test('missing startup scene is never guessed when multiple scenes exist',()=>{
 const project={...freshGameProject(),id:'multi',genre:'horror',activeSceneId:'main',startupSceneId:'old-name',scenes:[scene()]};
 assert.throws(()=>prepareGameDefinition({entities:[actor()],mode:'3d',project}),/Choisis explicitement/);
 assert.equal(project.startupSceneId,'old-name');
});
test('native CHAMBRE 07 is serializable to game build with all memories and endings',()=>{
 const demo=createChambre07Scene('3d');
 const project={...freshGameProject(),id:'chambre07-export',title:'CHAMBRE 07 · La Voix',genre:'horror'};
 const before=structuredClone(demo.entities);
 const build=prepareGameDefinition({entities:demo.entities,mode:'3d',camera:demo.camera,project});
 const entities=build.project.scenes[0].entities;
 assert.equal(build.mode,'3d');
 assert.equal(build.sceneContracts.length,1);
 assert.ok(entities.some(o=>o.playable3d&&o.controller3d));
 assert.ok(entities.some(o=>o.name==='Plancher · appartement'&&o.solid3d));
 assert.equal(entities.filter(o=>o.tags?.includes('chambre07-memory')).length,3);
 assert.ok(entities.some(o=>o.name==='Porte de sortie'&&o.sequence.branches.length===2));
 assert.deepEqual(demo.entities,before);
});
test('Web export html receives the actual portable startup payload',()=>{
 const project={...freshGameProject(),id:'html-test',title:'Export <Test>',genre:'horror'};
 const data=prepareGameDefinition({entities:[actor()],mode:'3d',project});
 const template='<html><head><title>Engine</title></head><body><script type="module" src="./js/editor.js?v=old"></script></body></html>';
 const html=gameBuildHtml(template,data);
 assert.ok(html.includes('src="./js/game-build-player.js"'));
 assert.ok(html.includes('id="warlikeGameData"'));
 assert.ok(html.includes('warlike-game-build'));
 assert.ok(!html.includes('src="./js/editor.js?v=old"'));
});
