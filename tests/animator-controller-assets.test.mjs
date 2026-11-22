import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultAnimatorGraph} from '../js/core/animator-graph.js';
import {freshGameProject,restoreGameProject,gameProject} from '../js/core/game-project.js';
import {
 animatorControllerAssets,createAnimatorControllerAsset,assignAnimatorControllerAsset,
 saveAnimatorControllerAsset,removeAnimatorControllerAsset,restoreAnimatorControllerAssets,
 animatorControllerOutdated,animatorControllerDiagnostics
} from '../js/core/animator-controller-assets.js';
import {readFileSync} from 'node:fs';

const makeObject=id=>({id,name:'Mon personnage '+id,model3dId:'user-real-glb',animatorGraph:defaultAnimatorGraph(),
 animationRig:{enabled:true,clips:[{name:'UserWalk',duration:2}],avatar:{type:'humanoid'}}});
test('Animator asset is a project-local resource independent of GameObject with no fabricated model',()=>{
 const project=freshGameProject(),source=makeObject(1),target=makeObject(2);
 const originalTargetRig=structuredClone(target.animationRig);
 const asset=createAnimatorControllerAsset(project,source,{name:'Humanoid.controller'});
 assert.equal(project.animatorControllers.length,1);
 assert.equal(asset.name,'Humanoid.controller');
 assert.equal(source.animatorControllerId,asset.id);
 assert.notEqual(asset.graph,source.animatorGraph);
 source.animatorGraph.states[0].speed=2.7;
 assert.notEqual(asset.graph.states[0].speed,source.animatorGraph.states[0].speed);
 assignAnimatorControllerAsset(project,target,asset.id);
 assert.equal(target.animatorControllerId,asset.id);
 assert.deepEqual(target.animatorGraph,asset.graph);
 assert.notEqual(target.animatorGraph,asset.graph);
 assert.deepEqual(target.animationRig,originalTargetRig,'Never overwrite imported GLB clips, skins or Avatar');
 assert.throws(()=>assignAnimatorControllerAsset(project,target,asset.id,{replace:false}),/Confirme/);
});
test('an explicitly saved Controller advances revision, with other instances unchanged until reassigned',()=>{
 const project=freshGameProject(),a=makeObject(1),b=makeObject(2);
 const asset=createAnimatorControllerAsset(project,a);
 assignAnimatorControllerAsset(project,b,asset.id);
 const oldGraph=structuredClone(b.animatorGraph);
 a.animatorGraph.states[0].speed=3;
 saveAnimatorControllerAsset(project,a);
 assert.equal(asset.revision,2);
 assert(animatorControllerOutdated(project,b));
 assert.deepEqual(b.animatorGraph,oldGraph);
 assignAnimatorControllerAsset(project,b,asset.id);
 assert.equal(b.animatorGraph.states[0].speed,3);
 assert.equal(b.animatorControllerRevision,2);
 assert.equal(animatorControllerOutdated(project,b),false);
 assert(removeAnimatorControllerAsset(project,asset.id));
 assert.deepEqual(b.animatorGraph,a.animatorGraph,'Removing library asset must not remove authored animation');
});
test('Controller library roundtrips through actual project restoration and validates imported data',()=>{
 const original=freshGameProject(),actor=makeObject(1);
 const created=createAnimatorControllerAsset(original,actor);
 const serialized=structuredClone(original);
 restoreGameProject(serialized,{entities:[actor]});
 assert.equal(animatorControllerAssets(gameProject)[0].id,created.id);
 assert.deepEqual(animatorControllerAssets(gameProject)[0].graph,actor.animatorGraph);
 const malformed={id:'bad',name:'Broken',revision:1,graph:{states:[],transitions:[]}};
 assert.deepEqual(restoreAnimatorControllerAssets([malformed]),[malformed]);
 assert.deepEqual(animatorControllerAssets({animatorControllers:[malformed]}),[]);
 assert.equal(animatorControllerAssets(freshGameProject()).length,0,'No demos or controllers auto-installed');
});
test('Inspector exposes a concise selector, explicit create and safe assign, plus separate Animator window',()=>{
 const code=readFileSync(new URL('../js/ui/inspector.js',import.meta.url),'utf8');
 for(const item of ['Animator Controller du projet','Créer Controller','Enregistrer Controller','Assigner','Ouvrir Animator'])
  assert(code.includes(item),item+' missing');
 assert(code.includes("warlike:animator-open"));
});

test('invalid, duplicate, oversized and future Controller data roundtrip without mutation',()=>{
 const asset={id:'good',name:'Controller',revision:1,graph:defaultAnimatorGraph(),future:{version:2,labels:['keep']}};
 const broken={...structuredClone(asset),id:'broken',graph:{states:[],transitions:[]}};
 const malformed={...structuredClone(asset),id:'malformed',graph:{...defaultAnimatorGraph(),layers:[null],transitions:[null]}};
 const duplicate={...structuredClone(asset),name:'Duplicate'};
 const data=[asset,broken,malformed,duplicate,null,...Array.from({length:61},(_,i)=>({...structuredClone(asset),id:'asset'+i}))];
 const original=structuredClone(data),project={...freshGameProject(),animatorControllers:data};
 for(let i=0;i<2;i++){
  restoreGameProject(JSON.parse(JSON.stringify(project)));
  assert.deepEqual(gameProject.animatorControllers,original,'Repeated restoration keeps the exact source representation');
 }
 assert.deepEqual(data,original);
 assert.equal(animatorControllerAssets(gameProject).length,61,'Ambiguous IDs and invalid graphs cannot be assigned');
 const issues=animatorControllerDiagnostics(gameProject).join(' ');
 assert.match(issues,/66 ressources conservées/);
 assert.match(issues,/Identifiant dupliqué/);
 assert.match(issues,/lecture seule/);
 const target=makeObject(5),before=structuredClone(target);
 for(const id of ['good','broken','malformed']){
  assert.throws(()=>assignAnimatorControllerAsset(gameProject,target,id),/introuvable/);
  assert.throws(()=>saveAnimatorControllerAsset(gameProject,target,{id}),/Aucun Controller/);
  assert.equal(removeAnimatorControllerAsset(gameProject,id),false);
 }
 assert.deepEqual(target,before);
 assert.throws(()=>createAnimatorControllerAsset(gameProject,target),/64/);
 assert.deepEqual(gameProject.animatorControllers,original);
});

test('unknown library formats are preserved and cannot be overwritten by creation',()=>{
 for(const value of [null,'future-library',{schema:'warlike.controllers.v2',entries:[{data:'keep'}]}]){
  restoreGameProject({animatorControllers:value});
  assert.deepEqual(gameProject.animatorControllers,value);
  assert.deepEqual(animatorControllerAssets(gameProject),[]);
  assert.match(animatorControllerDiagnostics(gameProject).join(' '),/lecture seule/);
  assert.throws(()=>createAnimatorControllerAsset(gameProject,makeObject(1)),/lecture seule/);
  assert.deepEqual(gameProject.animatorControllers,value);
 }
 restoreGameProject({});
 assert.deepEqual(gameProject.animatorControllers,[],'Old projects without a library still open normally');
 assert.deepEqual(animatorControllerDiagnostics(gameProject),[]);
});

test('valid metadata survives editing and deletion addresses the stored library',()=>{
 const asset={id:'good',name:'Controller',revision:1,graph:defaultAnimatorGraph(),future:{version:2}};
 const invalid={id:'invalid',graph:null};
 const project={animatorControllers:restoreAnimatorControllerAssets([invalid,asset])},target=makeObject(1);
 assignAnimatorControllerAsset(project,target,'good');
 target.animatorGraph.states[0].speed=2;
 saveAnimatorControllerAsset(project,target);
 assert.deepEqual(project.animatorControllers[1].future,{version:2});
 assert.deepEqual(project.animatorControllers[0],invalid);
 assert.equal(removeAnimatorControllerAsset(project,'good'),true);
 assert.deepEqual(project.animatorControllers,[invalid]);
 assert.deepEqual(asset.graph.states[0].speed,1,'Restoration creates independent editable data');
});
