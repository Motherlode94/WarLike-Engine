import test from 'node:test';
import assert from 'node:assert/strict';
import {savePrefab,readPrefabs,instantiatePrefab,applyPrefabChanges} from '../js/core/prefab-library.js';
const memory=()=>{const data=new Map();return {getItem:key=>data.get(key)||null,setItem:(key,value)=>data.set(key,value)}};
test('scene prefab serializes components but not placement and identity',()=>{
 const store=memory(),prefab=savePrefab({id:5,name:'Soldat',type:'mesh3d',x:17,y:28,assetId:'soldier',hp:100},store);
 const instance=instantiatePrefab(readPrefabs(store)[0],9,250,350);
 assert.equal(instance.id,9);assert.equal(instance.x,250);assert.equal(instance.y,350);
 assert.equal(instance.hp,100);assert.equal(instance.assetId,'soldier');
 assert.equal(prefab.name,'Soldat');
});
test('apply changes propagates shared component updates and preserves instance placement and overrides',()=>{
 const store=memory(),prefab=savePrefab({id:1,name:'Soldat',x:0,y:0,hp:100,color:'#aaaaaa'},store);
 const a=instantiatePrefab(prefab,2,10,20),b=instantiatePrefab(prefab,3,90,80);
 a.hp=150;b.prefabOverrides=['color'];b.color='#ffffff';
 const result=applyPrefabChanges(prefab,a,[a,b]);
 assert.equal(result.instances[1].hp,150);assert.equal(result.instances[1].color,'#ffffff');
 assert.equal(result.instances[1].x,90);assert.equal(result.instances[1].y,80);
});

test('applying prefab deletion removes stale inherited component but preserves overrides and unrelated legacy data',()=>{
 const store=memory();
 const prefab=savePrefab({id:1,name:'Old 3D prefab',type:'mesh3d',x:0,y:0,collider3d:{shape:'box'},stats:{health:100}},store,{mode:'3d'});
 const edited=instantiatePrefab(prefab,2,12,16);
 delete edited.collider3d;
 const normal=instantiatePrefab(prefab,3,80,90);
 normal.legacyAnimation={clip:'idle',version:1};
 const custom=instantiatePrefab(prefab,4,120,140);
 custom.prefabOverrides=['collider3d'];
 custom.collider3d={shape:'sphere'};
 const {instances}=applyPrefabChanges(prefab,edited,[edited,normal,custom]);
 assert.equal(Object.hasOwn(instances[1],'collider3d'),false);
 assert.deepEqual(instances[1].legacyAnimation,{clip:'idle',version:1});
 assert.equal(instances[1].x,80);
 assert.deepEqual(instances[2].collider3d,{shape:'sphere'});
 assert.equal(instances[2].id,4);
 assert.ok(Object.hasOwn(prefab.components,'collider3d'),'original prefab asset remains unchanged');
});

test('prefab instances cannot inherit source hierarchy identifiers or prefab links',()=>{
 const store=memory();
 const source={id:41,name:'Door source',type:'mesh3d',x:80,y:60,w:48,h:120,parentId:5,sceneObjectId:'legacy-door',prefabSourceId:'prefab-parent',prefabOverrides:['color'],inspectorOrder:['Transform'],color:'#33bb99'};
 const prefab=savePrefab(source,store,{mode:'3d'}),instance=instantiatePrefab(prefab,52,320,450);
 for(const field of ['id','name','x','y','parentId','sceneObjectId','prefabSourceId','prefabOverrides','inspectorOrder']){
  assert.equal(Object.hasOwn(prefab.components,field),false,'Source leaked '+field);
 }
 assert.equal(instance.id,52);assert.equal(instance.x,320);assert.equal(instance.y,450);
 assert.equal(instance.parentId,undefined);assert.equal(instance.sceneObjectId,undefined);
 assert.equal(instance.prefabSourceId,prefab.id);
 assert.deepEqual(instance.prefabOverrides,[]);
 assert.equal(instance.color,'#33bb99');
});
test('old prefabs with stored parent IDs are safely instantiated as independent roots',()=>{
 const legacy={id:'old',name:'Old',components:{type:'mesh3d',w:64,h:64,parentId:99,sceneObjectId:'old-root',prefabSourceId:'other',prefabOverrides:['w'],x:1,y:2}};
 const result=instantiatePrefab(legacy,7,70,80);
 assert.equal(result.parentId,undefined);assert.equal(result.sceneObjectId,undefined);
 assert.equal(result.prefabSourceId,'old');assert.deepEqual(result.prefabOverrides,[]);
 assert.equal(result.id,7);assert.equal(result.x,70);assert.equal(result.y,80);
});
