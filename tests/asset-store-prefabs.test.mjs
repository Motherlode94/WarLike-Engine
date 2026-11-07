import test from 'node:test';
import assert from 'node:assert/strict';
import {prefabFromBundledAsset,installBundledPrefab,installedPrefabIds,PREFAB_STORAGE_KEY} from '../asset-store/prefab-store.js';
import {readPrefabs,instantiatePrefab,prefabsForMode} from '../js/core/prefab-library.js';
const asset={id:'kenney-nature-test-tree',name:'Tree',author:'Kenney',category:'Nature',license:'CC0-1.0',source:'https://kenney.nl/assets/nature-kit',bundled:true,url:'https://example.org/assets/free/kenney/nature/tree.glb'};
const createStorage=()=>{const m=new Map();return{getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v)}};
test('prefab store generates a real native WarLike prefab referencing the bundled GLB id',()=>{
 const prefab=prefabFromBundledAsset(asset);
 assert.equal(prefab.mode,'3d');assert.equal(prefab.components.model3dId,asset.id);assert.equal(prefab.components.meshShape,'glb');assert.equal(prefab.components.type,'mesh3d');
 assert.equal(prefab.components.collision3d,false);assert.equal(prefab.origin.license,'CC0-1.0');
});
test('installed free prefabs are readable and instantiable using the engine prefab library',()=>{
 const storage=createStorage();const first=installBundledPrefab(asset,storage);assert.equal(first.installed,true);
 const second=installBundledPrefab(asset,storage);assert.equal(second.installed,false);
 const prefabs=readPrefabs(storage);assert.equal(prefabs.length,1);assert.equal(prefabsForMode(prefabs,'3d').length,1);
 const entity=instantiatePrefab(prefabs[0],44);assert.equal(entity.model3dId,asset.id);assert.equal(entity.prefabSourceId,prefabs[0].id);
 assert.ok(installedPrefabIds(storage).has(asset.id));
});
test('store does not overwrite customized prefabs and rejects non-bundled entries',()=>{
 const storage=createStorage();installBundledPrefab(asset,storage);
 const saved=JSON.parse(storage.getItem(PREFAB_STORAGE_KEY));saved[0].components.color='#ff8800';
 storage.setItem(PREFAB_STORAGE_KEY,JSON.stringify(saved));
 installBundledPrefab(asset,storage);
 assert.equal(readPrefabs(storage)[0].components.color,'#ff8800');
 assert.throws(()=>prefabFromBundledAsset({...asset,bundled:false}),/modèle 3D gratuit/);
});
