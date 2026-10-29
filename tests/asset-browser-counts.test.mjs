import test from 'node:test';
import assert from 'node:assert/strict';
import {uniqueAssets,filterAssetRecords,paginateAssets} from '../js/core/asset-browser.js';
import {freeModels3d} from '../js/assets/free-game-assets.js';
import {quaterniusModels3d} from '../js/assets/quaternius-game-assets.js';
import {prefabsForMode,savePrefab,readPrefabs,updatePrefab} from '../js/core/prefab-library.js';
const models=[...freeModels3d,...quaterniusModels3d];
test('every included model is reachable once through library pages and counts match the cards',()=>{
 const assets=uniqueAssets(models),ids=[];
 for(let page=1;page<=Math.ceil(assets.length/48);page++){const r=paginateAssets(assets,{page});ids.push(...r.items.map(a=>a.id));assert.equal(r.visible,r.end-r.start+1);assert.equal(r.total,assets.length)}
 assert.equal(ids.length,models.length);assert.equal(new Set(ids).size,models.length);assert.deepEqual(ids,models.map(a=>a.id));
});
test('category, author, animation and accent-insensitive search counts use the same records',()=>{
 for(const category of new Set(models.map(a=>a.category))){const expected=models.filter(a=>a.category===category&&a.author==='Quaternius'&&a.animationClips?.length>0),found=filterAssetRecords(models,{category,author:'Quaternius',animated:true});assert.deepEqual(found,expected);const page=paginateAssets(found);assert.equal(page.total,found.length);assert.equal(page.visible,Math.min(48,expected.length))}
 assert.equal(filterAssetRecords([{id:'a',name:'Épée dorée'},{id:'b',name:'Épée bleue'}],{query:'epee doree'}).length,1);
});
test('empty filters, changed page sizes, stale pages and duplicate IDs remain consistent',()=>{
 assert.deepEqual(uniqueAssets([{id:'a'},null,{id:'a'},{id:'b'}]).map(a=>a.id),['a','b']);
 const rows=Array.from({length:55},(_,i)=>({id:String(i)}));const last=paginateAssets(rows,{page:200,size:48});assert.equal(last.page,2);assert.equal(last.start,49);assert.equal(last.end,55);assert.equal(last.visible,7);
 const wide=paginateAssets(rows,{page:2,size:96});assert.equal(wide.page,1);assert.equal(wide.visible,55);
 const empty=paginateAssets([],{page:9});assert.equal(empty.start,0);assert.equal(empty.end,0);assert.equal(empty.visible,0);assert.equal(empty.page,1);
});
test('saved prefab counters and lists share 2D/3D compatibility and update notifications',()=>{
 const values=new Map(),storage={getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)};let changes=0;globalThis.document={dispatchEvent:e=>{assert.equal(e.type,'warlike:prefabs');changes++}};
 try{const two=savePrefab({id:1,name:'Sprite',type:'prefab',x:0,y:0},storage,{mode:'2d'});const three=savePrefab({id:2,name:'Lampe',type:'object',x:0,y:0},storage,{mode:'3d'});assert.deepEqual(prefabsForMode(readPrefabs(storage),'2d').map(p=>p.id),[two.id]);assert.deepEqual(prefabsForMode(readPrefabs(storage),'3d').map(p=>p.id),[three.id]);updatePrefab({...three,name:'Lampe modifiée'},storage);assert.equal(changes,3);assert.equal(prefabsForMode(readPrefabs(storage),'3d')[0].name,'Lampe modifiée');assert.equal(prefabsForMode([{id:'old',components:{type:'mesh3d'}}],'3d').length,1)}finally{delete globalThis.document}
});
