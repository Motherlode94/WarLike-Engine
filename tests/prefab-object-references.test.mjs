import test from 'node:test';
import assert from 'node:assert/strict';
import {makePrefabHierarchy,instantiatePrefabHierarchy,savePrefabHierarchy,readPrefabs,savePrefabVariant,updatePrefabNodeProperties,prefabObjectReferences} from '../js/core/prefab-library.js';
import {prefabPropertyOverrides,revertInspectorPrefab,applyInspectorPrefab} from '../js/core/inspector-prefabs.js';
import {canonicalScene,runtimeEntities} from '../js/core/scene-contract.js';
const memory=()=>{const data=new Map();return {getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,String(v))}};
function objects(){return [
 {id:10,name:'Character',type:'mesh3d',x:0,y:0,w:64,h:128,depth3d:64},
 {id:11,name:'Weapon',type:'mesh3d',parentId:10,x:0,y:0,w:10,h:10,socket3d:{enabled:true,targetId:10,bone:'Hand'}},
 {id:12,name:'Camera',type:'object',parentId:10,x:0,y:0,w:10,h:10,sceneCamera3d:{enabled:true,targetId:10},camera2d:{targetId:10}},
 {id:13,name:'Follower',type:'mesh3d',parentId:10,x:0,y:0,w:10,h:10,navigationAgent:{enabled:true,targetId:11},animationRig:{ik:[{type:'lookAt',targetId:12,target:[0,0,0]}]}}
 ];}
const save=store=>{const list=objects();return savePrefabHierarchy(list[0],list,store,{mode:'3d'})};
function expectReferences(list,start){
 assert.equal(list[1].socket3d.targetId,start);assert.equal(list[2].sceneCamera3d.targetId,start);assert.equal(list[2].camera2d.targetId,start);
 assert.equal(list[3].navigationAgent.targetId,start+1);assert.equal(list[3].animationRig.ik[0].targetId,start+2);
}
test('two prefab copies and scene roundtrips keep cameras, sockets, agents and IK inside their own instance',()=>{
 const store=memory(),prefab=save(store),before=JSON.stringify(prefab);
 assert.equal(prefab.version,4);assert.equal(prefab.objectReferences['node-11'].socket3d,'node-10');
 const a=instantiatePrefabHierarchy(prefab,100),b=instantiatePrefabHierarchy(prefab,200);
 expectReferences(a.entities,100);expectReferences(b.entities,200);expectReferences(runtimeEntities(canonicalScene(a.entities)),100);
 assert.equal(JSON.stringify(prefab),before);
 for(const entity of [...a.entities,...b.entities])assert.deepEqual(prefabPropertyOverrides(prefab,entity,[...a.entities,...b.entities]),[]);
 b.entities[1].socket3d.targetId=100;revertInspectorPrefab(prefab,b.entities[1],[...a.entities,...b.entities]);assert.equal(b.entities[1].socket3d.targetId,200);
});
test('variants and applying a retargeted socket use local keys in all instances',()=>{
 const store=memory(),prefab=save(store),variant=savePrefabVariant(prefab,{'node-12':{sceneCamera3d:{targetNodeKey:'node-11'}}},store);
 assert.equal(instantiatePrefabHierarchy(variant,300).entities[2].sceneCamera3d.targetId,301);
 const a=instantiatePrefabHierarchy(prefab,100).entities,b=instantiatePrefabHierarchy(prefab,200).entities;
 a[1].socket3d.targetId=a[3].id;
 const updated=applyInspectorPrefab(prefab,a[1],[...a,...b],store);
 assert.equal(updated[1].socket3d.targetId,103);assert.equal(updated[5].socket3d.targetId,203);
 const fresh=readPrefabs(store).find(p=>p.id===prefab.id);assert.equal(instantiatePrefabHierarchy(fresh,400).entities[1].socket3d.targetId,403);
});
test('nested prefabs qualify their own links and cross-boundary links into the expanded parent',()=>{
 const store=memory(),source=save(store),nested=instantiatePrefabHierarchy(source,100).entities;
 const root={id:50,name:'Squad',type:'mesh3d',x:0,y:0,w:64,h:64};nested[0].parentId=50;
 const outside={id:51,parentId:50,name:'Squad camera',type:'object',x:0,y:0,w:10,h:10,sceneCamera3d:{targetId:101}};
 // A child socket can explicitly target an object in its containing composition.
 nested[1].socket3d.targetId=50;
 const parent=savePrefabHierarchy(root,[root,...nested,outside],store,{mode:'3d'});
 const expanded=readPrefabs(store).find(p=>p.id===parent.id),a=instantiatePrefabHierarchy(expanded,500).entities,b=instantiatePrefabHierarchy(expanded,600).entities;
 assert.equal(a[2].socket3d.targetId,500);assert.equal(a.at(-1).sceneCamera3d.targetId,502);
 assert.equal(b[2].socket3d.targetId,600);assert.equal(b.at(-1).sceneCamera3d.targetId,602);
 assert.equal(a[3].sceneCamera3d.targetId,501);
});
test('unchanged nested references follow source updates instead of becoming stale parent overrides',()=>{
 const store=memory(),source=save(store),nested=instantiatePrefabHierarchy(source,100).entities;
 const root={id:50,name:'Squad',type:'mesh3d',x:0,y:0,w:64,h:64};nested[0].parentId=50;
 const parent=savePrefabHierarchy(root,[root,...nested],store,{mode:'3d'});
 updatePrefabNodeProperties(source.id,'node-12',{sceneCamera3d:{targetNodeKey:'node-11'}},[],store);
 const expanded=readPrefabs(store).find(p=>p.id===parent.id),instance=instantiatePrefabHierarchy(expanded,700).entities;
 assert.equal(instance[3].sceneCamera3d.targetId,702);
});
test('legacy local references are resolved without writing storage; external references are preserved',()=>{
 const store=memory(),list=objects(),legacy={...makePrefabHierarchy(list[0],list,{mode:'3d'}),id:'legacy',version:3};delete legacy.objectReferences;
 legacy.nodes[2].data.sceneCamera3d.targetId=999;
 store.setItem('warlike.prefabs.library.v1',JSON.stringify([legacy]));const original=store.getItem('warlike.prefabs.library.v1');
 for(let i=0;i<2;i++){
  const instance=instantiatePrefabHierarchy(readPrefabs(store)[0],800).entities;
  assert.equal(instance[1].socket3d.targetId,800);assert.equal(instance[2].sceneCamera3d.targetId,999);
 }
 assert.equal(store.getItem('warlike.prefabs.library.v1'),original);
 save(store);assert.equal(store.getItem('warlike.prefabs.library.v1.before-v4'),original);
});
test('dangling local reference keys fail before returning a partial instance',()=>{
 const prefab=save(memory());prefab.objectReferences['node-11'].socket3d='missing';
 assert.throws(()=>prefabObjectReferences(prefab),/Cible/);assert.throws(()=>instantiatePrefabHierarchy(prefab,900),/Cible/);
});
test('an external retarget cannot be confused with a source node having the same numeric ID',()=>{
 const store=memory(),prefab=save(store),a=instantiatePrefabHierarchy(prefab,100).entities;
 const external={id:10,name:'External camera target',type:'object',x:0,y:0,w:10,h:10};
 a[2].sceneCamera3d.targetId=10;applyInspectorPrefab(prefab,a[2],[...a,external],store);
 const fresh=readPrefabs(store).find(p=>p.id===prefab.id),instance=instantiatePrefabHierarchy(fresh,500).entities;
 assert.equal(instance[2].sceneCamera3d.targetId,10);assert.equal(instance[1].socket3d.targetId,500);
 const detached=savePrefabVariant(fresh,{'node-11':{socket3d:{targetId:0}}},store);
 assert.equal(instantiatePrefabHierarchy(detached,600).entities[1].socket3d.targetId,0);
});
