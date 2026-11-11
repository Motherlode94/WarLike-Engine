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
