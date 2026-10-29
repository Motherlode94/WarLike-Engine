import test from 'node:test';
import assert from 'node:assert/strict';
import {state} from '../js/core/state.js';
import {workspace,switchWorkspace} from '../js/core/workspaces.js';
import {gameProject,captureGameScene} from '../js/core/game-project.js';
const elements=new Map();
globalThis.localStorage={
 getItem:k=>elements.get(k)??null,
 setItem:(k,v)=>{elements.set(k,String(v))},
 removeItem:k=>elements.delete(k)
};
globalThis.document={
 dispatchEvent:()=>true,
 querySelector:()=>({replaceChildren(){},append(){},disabled:false,textContent:''}),
 createElement:()=>({textContent:'',classList:{toggle(){}},onclick:null})
};
const {createProject,openProject,saveProject,listProjects,renameProject,deleteProject,chooseProjectGenre,hub}=await import('../js/core/project-hub.js');

test('Hub saves independently named 2D and 3D projects',()=>{
 state.playing=false;
 const a=createProject('Arena 2D','2d');
 assert.equal(workspace.mode,'2d');
 state.entities.push({id:2,name:'Arena wall',type:'object',x:100,y:100,w:50,h:50,color:'#aabbcc'});
 state.nextId=3;assert.equal(saveProject(),true);
 const b=createProject('World 3D','3d');
 assert.equal(workspace.mode,'3d');
 assert.ok(state.entities.some(o=>o.type==='mesh3d'&&o.playable3d));
 assert.equal(listProjects().length,2);
 assert.ok(renameProject(b,'World Renamed'));
 assert.equal(listProjects().find(p=>p.id===b).name,'World Renamed');
 openProject(a);
 assert.ok(state.entities.some(o=>o.name==='Arena wall'));
 assert.equal(state.entities.some(o=>o.type==='mesh3d'),false);
 openProject(b);
 assert.ok(state.entities.some(o=>o.playable3d));
 deleteProject(a);
 assert.equal(listProjects().length,1);
});

test('Hub preserves custom game title, scenes and initial variables independently of project name',()=>{
 state.playing=false;const id=createProject('Prototype de travail','2d');
 gameProject.title='Les Trois Lanternes';gameProject.variables=[{name:'coins',type:'number',value:7}];
 captureGameScene(state.entities,state.camera,{id:'chapter-one',name:'Chapitre 1'});gameProject.startupSceneId='chapter-one';
 assert.equal(saveProject(),true);createProject('Autre projet','3d');openProject(id);
 assert.equal(gameProject.title,'Les Trois Lanternes');assert.equal(gameProject.startupSceneId,'chapter-one');assert.equal(gameProject.scenes[0].name,'Chapitre 1');assert.equal(gameProject.variables[0].value,7);assert.equal(gameProject.id,id);
});
test('Adventure Hub installs and reopens both chapters in each independent workspace',()=>{
 state.playing=false;const id=createProject('Le phare et la vallée','2d','starter','adventure');assert.deepEqual(gameProject.scenes.map(s=>s.id),['main','echo-valley']);assert.equal(saveProject(),true);switchWorkspace('3d');assert.equal(gameProject.scenes.length,2);assert.ok(gameProject.scenes[1].entities.some(o=>o.name==='Pont à réparer'));createProject('Autre projet témoin','2d');openProject(id);assert.equal(gameProject.genre,'adventure');assert.equal(gameProject.scenes.length,2);assert.ok(gameProject.scenes[1].entities.some(o=>o.name==='Orin · archiviste'));
});

test('genre survives project reopen and independent workspace switches',()=>{
 state.playing=false;const id=createProject('Mon survival','3d','starter','survival');assert.equal(gameProject.genre,'survival');assert.equal(hub.genre,'survival');switchWorkspace('2d');assert.equal(gameProject.genre,'survival');assert.equal(gameProject.id,id);saveProject();assert.equal(listProjects().find(p=>p.id===id).type,'2d');createProject('RPG séparé','3d','starter','rpg');openProject(id);assert.equal(gameProject.genre,'survival');assert.equal(workspace.mode,'2d');assert.equal(gameProject.title,'Mon survival');
});
test('platformer creation is 2D only and its other workspace remains a valid blank project',()=>{
 state.playing=false;const id=createProject('Plateforme Kenney','2d','starter','platformer');assert.equal(gameProject.genre,'platformer');assert.ok(state.entities.some(o=>o.controller2d?.mode==='platformer'));switchWorkspace('3d');assert.equal(gameProject.genre,'sandbox');assert.equal(gameProject.id,id);assert.ok(state.entities.some(o=>o.playable3d));switchWorkspace('2d');assert.equal(gameProject.genre,'platformer');const before=JSON.stringify(state.entities);assert.throws(()=>createProject('Incompatible','3d','starter','platformer'),/incompatible/);assert.equal(JSON.stringify(state.entities),before);
});
test('changing a project genre retains authored entities, title and scenes',()=>{
 state.playing=false;const id=createProject('Projet personnalisé','3d','starter','sandbox');gameProject.title='Mon titre conservé';state.entities[0].name='Mon personnage';captureGameScene(state.entities,state.camera,{id:'custom'});const entities=JSON.stringify(state.entities),scenes=JSON.stringify(gameProject.scenes);assert.equal(chooseProjectGenre(id,'rpg'),true);assert.equal(gameProject.genre,'rpg');assert.equal(JSON.stringify(state.entities),entities);assert.equal(JSON.stringify(gameProject.scenes),scenes);assert.equal(gameProject.title,'Mon titre conservé');createProject('Autre','2d');openProject(id);assert.equal(gameProject.genre,'rpg');assert.equal(state.entities[0].name,'Mon personnage');assert.throws(()=>chooseProjectGenre(id,'platformer'),/incompatible/);state.playing=true;assert.throws(()=>chooseProjectGenre(id,'survival'),/Arrête Play/);state.playing=false;
});
test('changing a closed project genre leaves the current project untouched',()=>{
 const closed=createProject('Projet fermé','2d');createProject('Actuel','3d','starter','survival');const activeId=gameProject.id;assert.equal(chooseProjectGenre(closed,'rpg'),true);assert.equal(gameProject.id,activeId);assert.equal(gameProject.genre,'survival');openProject(closed);assert.equal(gameProject.genre,'rpg');
});
test('legacy Hub data migrates a stored top-level genre into the active game configuration',()=>{
 const id=createProject('Ancien RPG','3d','starter','rpg');const key='warlike.hub.project.'+id,data=JSON.parse(elements.get(key));for(const slot of Object.values(data.workspaces))delete slot.game.genre;elements.set(key,JSON.stringify(data));createProject('Intermédiaire','2d');openProject(id);assert.equal(gameProject.genre,'rpg');assert.equal(hub.genre,'rpg');
});

test('changing a legacy closed project genre preserves its existing project name as game title',()=>{
 const id=createProject('Ancien projet sans configuration','2d');const key='warlike.hub.project.'+id,data=JSON.parse(elements.get(key));delete data.workspaces['2d'].game;elements.set(key,JSON.stringify(data));createProject('Projet témoin','3d');assert.equal(chooseProjectGenre(id,'rpg'),true);openProject(id);assert.equal(gameProject.title,'Ancien projet sans configuration');assert.equal(gameProject.genre,'rpg');
});
