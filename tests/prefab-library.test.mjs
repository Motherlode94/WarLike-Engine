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
