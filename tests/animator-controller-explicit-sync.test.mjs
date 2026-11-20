import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {defaultAnimatorGraph} from '../js/core/animator-graph.js';
import {freshGameProject} from '../js/core/game-project.js';
import {createAnimatorControllerAsset,assignAnimatorControllerAsset,saveAnimatorControllerAsset,animatorControllerOutdated,synchronizeAnimatorControllerAsset} from '../js/core/animator-controller-assets.js';

const actor=id=>({id,name:'Acteur '+id,animatorGraph:defaultAnimatorGraph(),animationRig:{enabled:true,clips:[],avatar:{schema:'warlike.avatar.v1',enabled:false,bones:{},id:'avatar-'+id}}});

test('explicit synchronization updates only the chosen instance and never its Avatar or clips',()=>{
 const project=freshGameProject(),a=actor(1),b=actor(2),c=actor(3);
 const asset=createAnimatorControllerAsset(project,a);assignAnimatorControllerAsset(project,b,asset.id);assignAnimatorControllerAsset(project,c,asset.id);
 const bRig=structuredClone(b.animationRig),cGraph=structuredClone(c.animatorGraph);
 a.animatorGraph.states[0].speed=2.5;saveAnimatorControllerAsset(project,a);
 assert(animatorControllerOutdated(project,b));assert(animatorControllerOutdated(project,c));
 assert.throws(()=>synchronizeAnimatorControllerAsset(project,b),/Confirme/);
 assert(animatorControllerOutdated(project,b),'an unconfirmed action must not change revision');
 synchronizeAnimatorControllerAsset(project,b,{confirmed:true});
 assert.equal(b.animatorGraph.states[0].speed,2.5);
 assert.equal(b.animatorControllerRevision,2);
 assert.deepEqual(b.animationRig,bRig);
 assert.deepEqual(c.animatorGraph,cGraph,'other instances must remain isolated');
 assert(animatorControllerOutdated(project,c));
});
test('missing controller and unlinked GameObjects do not lose their graph',()=>{
 const project=freshGameProject(),a=actor(1),before=structuredClone(a.animatorGraph);
 assert.throws(()=>synchronizeAnimatorControllerAsset(project,a,{confirmed:true}),/ne possède pas/);
 assert.deepEqual(a.animatorGraph,before);
 a.animatorControllerId='missing';
 assert.throws(()=>synchronizeAnimatorControllerAsset(project,a,{confirmed:true}),/introuvable/);
 assert.deepEqual(a.animatorGraph,before);
});
test('Inspector explicitly confirms before syncing and does not silently apply asset changes',()=>{
 const source=readFileSync(new URL('../js/ui/inspector.js',import.meta.url),'utf8');
 assert.match(source,/Synchroniser Controller/);
 assert.match(source,/synchronizeAnimatorControllerAsset\(gameProject,o,\{confirmed:true\}\)/);
 assert.match(source,/window\.confirm\('Synchroniser depuis le Controller du projet/);
});
