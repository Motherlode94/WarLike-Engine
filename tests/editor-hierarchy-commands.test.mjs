import test from 'node:test';
import assert from 'node:assert/strict';
import {hierarchyIndex,descendants,validateReparent,reparentEntities,deleteEntitySubtrees,duplicateEntitySubtrees} from '../js/core/scene-graph-v2.js';
import {copyEntitiesPayload,pasteEntitiesPayload} from '../js/core/editor-clipboard.js';

const objects=()=>[
 {id:1,parentId:null,name:'Player',x:10,y:10,w:32,h:48,components:[]},
 {id:2,parentId:1,name:'Katana Mesh',x:1,y:3,w:12,h:30,components:[]},
 {id:3,parentId:2,name:'Blade FX',x:0,y:0,w:12,h:12,components:[]},
 {id:4,parentId:null,name:'Main Camera',x:100,y:50,w:80,h:60,components:[]}
];
test('tree derives nested children from one canonical parentId',()=>{
 const scene=objects(),graph=hierarchyIndex(scene);
 assert.deepEqual(graph.children.get(1).map(o=>o.id),[2]);
 assert.deepEqual([...descendants(scene,1)],[1,2,3]);
 assert.deepEqual(graph.children.get(null).map(o=>o.id),[1,4]);
});
test('drag reparent validates cycles, missing IDs and preserves original',()=>{
 const scene=objects();
 assert.throws(()=>validateReparent(scene,1,3),/cyclique/);
 assert.throws(()=>validateReparent(scene,2,2),/propre parent/);
 assert.throws(()=>validateReparent(scene,2,99),/inexistant/);
 const moved=reparentEntities(scene,2,4);
 assert.equal(moved[1].parentId,4);
 assert.equal(scene[1].parentId,1);
});
test('delete and duplicate operate on complete subtrees',()=>{
 const scene=objects();
 assert.deepEqual(deleteEntitySubtrees(scene,[2]).entities.map(o=>o.id),[1,4]);
 const copy=duplicateEntitySubtrees(scene,[1,2],5);
 assert.equal(copy.selected.length,1);
 assert.equal(copy.entities.length,7);
 assert.deepEqual(copy.entities.slice(4).map(o=>o.parentId),[null,5,6]);
 assert.deepEqual(copy.entities.slice(4).map(o=>o.id),[5,6,7]);
 assert.equal(copy.nextId,8);
 assert.equal(scene.length,4);
});
test('clipboard paste never retains an orphaned parent',()=>{
 const scene=objects();
 const detached=copyEntitiesPayload(scene,[2],'3d');
 const result=pasteEntitiesPayload(detached,{entities:scene,mode:'3d',nextId:5});
 assert.equal(result.entities.at(-1).parentId,null);
 const joined=copyEntitiesPayload(scene,[1,2,3],'3d');
 const joinedResult=pasteEntitiesPayload(joined,{entities:scene,mode:'3d',nextId:5});
 assert.deepEqual(joinedResult.entities.slice(4).map(o=>o.parentId),[null,5,6]);
});
