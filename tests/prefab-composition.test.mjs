import test from 'node:test';import assert from 'node:assert/strict';
import {savePrefabHierarchy,instantiatePrefabHierarchy,readPrefabs,savePrefabVariant,updatePrefabNodeProperties} from '../js/core/prefab-library.js';
import {prefabPropertyOverrides,revertInspectorPrefab,applyInspectorPrefab} from '../js/core/inspector-prefabs.js';
import {inspectorMetadata} from '../js/core/inspector-model.js';
import {canonicalScene,runtimeEntities} from '../js/core/scene-contract.js';
const memory=()=>{const data=new Map();return {getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,String(v))}};
const objects=()=>[{id:1,name:'Car',type:'mesh3d',x:100,y:100,w:64,h:64,color:'#aaaaaa'},{id:2,name:'Door',type:'mesh3d',parentId:1,x:120,y:100,w:10,h:40,color:'#111111',rigidbody3d:{mass:2,drag:.2},joint3d:{enabled:true,kind:'hinge',targetId:1}}];
const saved=store=>{const list=objects();return savePrefabHierarchy(list[0],list,store,{mode:'3d'})};
test('nested source stays linked and expands updates, remaps joints and preserves placement in two copies',()=>{
 const store=memory(),child=saved(store),nested=instantiatePrefabHierarchy(child,10,500,500),outer={id:20,name:'Garage',type:'mesh3d',x:300,y:300,w:100,h:100,color:'#ffffff'};
 nested.entities[0].parentId=20;const parent=savePrefabHierarchy(outer,[outer,...nested.entities],store,{mode:'3d'});assert.equal(parent.version,3);assert.equal(parent.nodes.length,2);assert.equal(parent.nodes[1].nested.prefabId,child.id);
 const oldRaw=store.getItem('warlike.prefabs.library.v1');updatePrefabNodeProperties(child.id,'node-2',{rigidbody3d:{mass:7}},[],store);
 const resolved=readPrefabs(store).find(p=>p.id===parent.id);assert.equal(resolved.nodes.length,3);
 const first=instantiatePrefabHierarchy(resolved,100,800,800),second=instantiatePrefabHierarchy(resolved,200,1000,1000);
 assert.equal(first.entities[2].rigidbody3d.mass,7);assert.equal(first.entities[2].joint3d.targetId,101);assert.equal(second.entities[2].joint3d.targetId,201);
 assert.equal(first.entities[1].x,1000);assert.equal(first.entities[2].x,1020);assert.equal(first.entities[2].prefabSourceId,child.id);assert.equal(first.entities[2].prefabInstanceRootId,101);assert.equal(first.entities[2].prefabLinks.length,2);
 assert.ok(store.getItem('warlike.prefabs.library.v1.before-v3'));assert.notEqual(store.getItem('warlike.prefabs.library.v1'),oldRaw);
});
test('three-level composition and variants follow source changes without flattening raw dependencies',()=>{
 const store=memory(),child=saved(store);const nest=(source,id)=>{const items=instantiatePrefabHierarchy(readPrefabs(store).find(p=>p.id===source.id),id,0,0).entities,root={...objects()[0],id:id+20};items[0].parentId=root.id;return savePrefabHierarchy(root,[root,...items],store,{mode:'3d'})};
 const middle=nest(child,30),outer=nest(middle,100);const variant=savePrefabVariant(child,{'node-2':{rigidbody3d:{mass:9}}},store,{name:'Heavy door'});
 updatePrefabNodeProperties(child.id,'node-2',{rigidbody3d:{drag:.8}},[],store);
 const list=readPrefabs(store),v=list.find(p=>p.id===variant.id);assert.deepEqual(v.nodes[1].data.rigidbody3d,{mass:9,drag:.8});assert.equal(list.find(p=>p.id===outer.id).nodes.length,4);
 assert.ok(JSON.parse(store.getItem('warlike.prefabs.library.v1')).find(p=>p.id===middle.id).nodes[1].nested);
});
test('property propagation preserves each instance override and child joint restoration cannot target another copy',()=>{
 const store=memory(),p=saved(store),a=instantiatePrefabHierarchy(p,10,100,100).entities,b=instantiatePrefabHierarchy(p,20,500,500).entities;
 a[1].rigidbody3d.mass=4;b[1].rigidbody3d.drag=.9;
 const all=applyInspectorPrefab(p,a[1],[...a,...b],store);assert.equal(all[3].rigidbody3d.mass,4);assert.equal(all[3].rigidbody3d.drag,.9);
 const fresh=readPrefabs(store)[0];all[3].joint3d.targetId=10;assert.ok(prefabPropertyOverrides(fresh,all[3],all).includes('joint3d'));revertInspectorPrefab(fresh,all[3],all);assert.equal(all[3].joint3d.targetId,20);
});
test('variant leaf overrides and removed properties are explicit and base updates remain live',()=>{
 const store=memory(),p=saved(store),v=savePrefabVariant(p,{'node-2':{rigidbody3d:{mass:8}}},store,{removedProperties:{'node-2':['rigidbody3d.drag']}});
 updatePrefabNodeProperties(p.id,'node-2',{rigidbody3d:{mass:3,drag:.7,gravityScale:2}},[],store);const node=readPrefabs(store).find(p=>p.id===v.id).nodes[1];assert.deepEqual(node.data.rigidbody3d,{mass:8,gravityScale:2});
});
test('unknown/cyclic nested assets report errors and legacy records are not migrated during reads',()=>{
 const store=memory(),old={id:'legacy',name:'Old',components:{type:'mesh3d'}};store.setItem('warlike.prefabs.library.v1',JSON.stringify([old]));const before=store.getItem('warlike.prefabs.library.v1');readPrefabs(store);assert.equal(store.getItem('warlike.prefabs.library.v1'),before);
 const cyclic={id:'cycle',components:{},nodes:[{key:'root',parentKey:null,data:{},nested:{prefabId:'cycle'}}]};store.setItem('warlike.prefabs.library.v1',JSON.stringify([cyclic]));assert.equal(readPrefabs(store)[0].invalidVariant,true);assert.throws(()=>instantiatePrefabHierarchy(readPrefabs(store)[0],1));
});
test('scene export/import metadata retains source chains and stable node keys',()=>{
 const store=memory(),p=saved(store),entries=instantiatePrefabHierarchy(p,10,50,50).entities;const loaded=runtimeEntities(canonicalScene(entries));assert.deepEqual(loaded[1].prefabLinks,entries[1].prefabLinks);assert.equal(inspectorMetadata(entries[1]).prefabNodeKey,'node-2');assert.equal(inspectorMetadata(entries[1]).prefabInstanceRootId,10);
});
test('corrupt storage is preserved on writes and future records survive alongside new prefabs',()=>{
 const store=memory();store.setItem('warlike.prefabs.library.v1','{corrupt');assert.throws(()=>saved(store),/illisible/);assert.equal(store.getItem('warlike.prefabs.library.v1'),'{corrupt');
 const future={id:'future',version:99,unknownFormat:{keep:true}};store.setItem('warlike.prefabs.library.v1',JSON.stringify([future]));saved(store);assert.deepEqual(JSON.parse(store.getItem('warlike.prefabs.library.v1'))[0],future);
});
test('nested property overrides affect only changed leaves and explicit deletions survive source refresh',()=>{
 const store=memory(),child=saved(store),nested=instantiatePrefabHierarchy(child,10,500,500),outer={...objects()[0],id:20,name:'Garage'};nested.entities[0].parentId=20;nested.entities[1].rigidbody3d.mass=8;delete nested.entities[1].rigidbody3d.drag;
 const parent=savePrefabHierarchy(outer,[outer,...nested.entities],store,{mode:'3d'});updatePrefabNodeProperties(child.id,'node-2',{rigidbody3d:{mass:3,drag:.7,gravityScale:2}},[],store);
 const p=readPrefabs(store).find(p=>p.id===parent.id);assert.deepEqual(p.nodes[2].data.rigidbody3d,{mass:8,gravityScale:2});
});
