import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultAnimatorGraph} from '../js/core/animator-graph.js';
import {freshGameProject,restoreGameProject,gameProject} from '../js/core/game-project.js';
import {
 animatorControllerAssets,createAnimatorControllerAsset,assignAnimatorControllerAsset,
 saveAnimatorControllerAsset,removeAnimatorControllerAsset,restoreAnimatorControllerAssets,
 animatorControllerOutdated
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
 assert.deepEqual(restoreAnimatorControllerAssets([malformed]),[]);
 assert.equal(animatorControllerAssets(freshGameProject()).length,0,'No demos or controllers auto-installed');
});
test('Inspector exposes a concise selector, explicit create and safe assign, plus separate Animator window',()=>{
 const code=readFileSync(new URL('../js/ui/inspector.js',import.meta.url),'utf8');
 for(const item of ['Animator Controller du projet','Créer Controller','Enregistrer Controller','Assigner','Ouvrir Animator'])
  assert(code.includes(item),item+' missing');
 assert(code.includes("warlike:animator-open"));
});
