import test from 'node:test';
import assert from 'node:assert/strict';
import {planLibraryPrefabInstall,installLibraryPrefab} from '../js/core/library-transfer.js';

function store(){const values=new Map();return{getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value)};}
function record(hash,source='test-prefab'){return{id:'library-'+hash.slice(0,24),sha256:hash,metadata:{name:'Vehicle',sourcePrefabId:source,parentId:null,license:'CC0',sourceUrl:null,config:{transform:{position:[0,0,0],rotation:[0,0,0],scale:[1,1,1]},renderer:null,collider:null,vehicle:null,rigidbody:null}}};}
test('new, identical and conflicting versions are detected',()=>{
 const storage=store(),a=record('a'.repeat(64)),b=record('b'.repeat(64));
 assert.equal(planLibraryPrefabInstall(a,storage).status,'new');
 assert.equal(installLibraryPrefab(a,storage).installed,true);
 assert.equal(planLibraryPrefabInstall(a,storage).status,'unchanged');
 assert.equal(installLibraryPrefab(a,storage).installed,false);
 assert.equal(planLibraryPrefabInstall(b,storage).status,'conflict');
 assert.throws(()=>installLibraryPrefab(b,storage),/Conflit de version/);
 assert.equal(JSON.parse(storage.getItem('warlike.prefabs.library.v1')).length,1);
 const result=installLibraryPrefab(b,storage,{replace:true});
 assert.equal(result.updated,true);
 assert.equal(JSON.parse(storage.getItem('warlike.prefabs.library.v1')).length,1);
 assert.equal(planLibraryPrefabInstall(b,storage).status,'unchanged');
});
