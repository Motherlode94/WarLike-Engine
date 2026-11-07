import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {webcrypto} from 'node:crypto';
import {parseLibraryTransfer,nativePrefabFromTransfer,installLibraryPrefab} from '../js/core/library-transfer.js';
import {registerLocalModel,importedModels3d} from '../js/assets/real-models-3d.js';
const glb=readFileSync(new URL('../assets/free/kenney/mini-characters/character-male-a.glb',import.meta.url));
const sha=Buffer.from(await webcrypto.subtle.digest('SHA-256',glb)).toString('hex');
const pack=()=>({schema:'warlike.library.transfer.v1',version:1,asset:{id:'source-character',name:'Soldier',kind:'model',filename:'character-male-a.glb',license:'CC0-1.0',url:'https://warlike-library.pages.dev/assets/kenney/character-male-a.glb'},prefab:{schema:'warlike.prefab.v1',id:'prefab-soldier',mode:'3d',name:'Soldier prefab',assetId:'source-character',parentId:null,components:{transform:{position:[1,2,3],rotation:[0,40,0],scale:[1.5,2,1]},renderer:{visible:true,castShadow:true},collider:{enabled:true,shape:'capsule',isTrigger:false}}},binary:{encoding:'base64',data:glb.toString('base64'),byteLength:glb.length,sha256:sha}});
const store=()=>{const values=new Map();return{getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)}};
test('actual GLB bytes transfer into a stable model and native Engine prefab',async()=>{
 const record=await parseLibraryTransfer(pack());assert.ok(record.meshCount>0);
 assert.equal(record.id,'library-'+sha.slice(0,24));
 assert.equal(record.blob.size,glb.length);
 const prefab=nativePrefabFromTransfer(record);
 assert.equal(prefab.components.model3dId,record.id);
 assert.equal(prefab.components.w,120);
 assert.equal(prefab.components.h,160);
 assert.equal(prefab.components.collision3d,true);
 const storage=store();
 const first=installLibraryPrefab(record,storage),second=installLibraryPrefab(record,storage);
 assert.equal(first.installed,true);assert.equal(second.installed,false);
 assert.equal(JSON.parse(storage.getItem('warlike.prefabs.library.v1')).length,1);
});
test('tampered file, disallowed extension, broken transform or inconsistent hashes are refused',async()=>{
 const invalid=pack();invalid.binary.sha256='0'.repeat(64);await assert.rejects(parseLibraryTransfer(invalid),/SHA-256/);
 const extension=pack();extension.asset.filename='character.exe';await assert.rejects(parseLibraryTransfer(extension),/incompatibles/);
 const vector=pack();vector.prefab.components.transform.scale=[1,Infinity,1];await assert.rejects(parseLibraryTransfer(vector),/Échelle/);
 const missing=pack();missing.binary.byteLength=0;await assert.rejects(parseLibraryTransfer(missing),/Métadonnées/);
});
test('registered Library model has a persistent deterministic lookup ID',()=>{
 const file=new File([glb],'character-male-a.glb',{type:'model/gltf-binary'});
 const id='library-'+sha.slice(0,24);
 const model=registerLocalModel(file,{id,license:'CC0-1.0'});
 assert.equal(model.id,id);
 assert.equal(importedModels3d.get(id).file.size,glb.length);
 assert.throws(()=>registerLocalModel(file,{id:'invalid-model-id'}),/Identifiant/);
 importedModels3d.delete(id);
});
test('import page exposes real user-file transfer without cloud claims',()=>{
 const html=readFileSync(new URL('../asset-store/library-import.html',import.meta.url),'utf8');
 assert.ok(html.includes('parseLibraryTransfer'));
 assert.ok(html.includes('storeLibraryModel'));
 assert.ok(html.includes('installLibraryPrefab'));
});

test('direct Library handshake has strict origins, channel and same verified installer',()=>{
 const html=readFileSync(new URL('../asset-store/library-import.html',import.meta.url),'utf8');
 assert.ok(html.includes("const LIBRARY_ORIGIN='https://warlike-library.pages.dev'"));
 assert.ok(html.includes("event.origin!==LIBRARY_ORIGIN"));
 assert.ok(html.includes("event.source!==window.opener"));
 assert.ok(html.includes("event.data?.channel!==channel"));
 assert.ok(html.includes("warlike-library-ping-v1"));
 assert.ok(html.includes("warlike-engine-installed-v1"));
 assert.ok(html.includes('await storeLibraryModel(record)'));
 assert.ok(html.includes('installLibraryPrefab(record,localStorage,{replace})'));
});
