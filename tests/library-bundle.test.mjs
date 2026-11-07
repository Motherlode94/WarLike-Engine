import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {parseLibraryTransfer,nativePrefabFromTransfer} from '../js/core/library-transfer.js';
import {parseLibraryBundle,planBundlePrefabs} from '../js/core/library-bundle.js';
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/rGQAAAAASUVORK5CYII=','base64');
const digest=async b=>Buffer.from(await webcrypto.subtle.digest('SHA-256',b)).toString('hex');
function memory(){const values=new Map();return{getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)}} 
async function sprite(){return{schema:'warlike.library.transfer.v1',version:1,asset:{id:'sprite-1',kind:'image',name:'Sprite',filename:'sprite.png',license:'CC0'},prefab:{schema:'warlike.prefab.v1',id:'prefab-sprite-1',assetId:'sprite-1',name:'Sprite prefab',mode:'2d',parentId:null,components:{collider:{enabled:true,shape:'box',isTrigger:false}}},binary:{encoding:'base64',byteLength:png.length,sha256:await digest(png),data:png.toString('base64')}};}
async function script(){const bytes=Buffer.from('export function Start(){ return 1; }');return{id:'script-1',filename:'sample.js',license:'MIT',binary:{encoding:'base64',byteLength:bytes.length,sha256:await digest(bytes),data:bytes.toString('base64')}};}
test('actual PNG is stored as a native 2D prefab with its bytes, not a missing URL',async()=>{
 const record=await parseLibraryTransfer(await sprite()),prefab=nativePrefabFromTransfer(record);
 assert.equal(record.metadata.mode,'2d');
 assert.equal(record.metadata.width,1);assert.equal(record.metadata.height,1);
 assert.equal(prefab.mode,'2d');assert.match(prefab.components.spriteUrl,/^data:image\/png;base64,/);
});
test('multi-asset contract validates sprite and source scripts before install',async()=>{
 const bundle=await parseLibraryBundle({schema:'warlike.library.bundle.v2',version:2,items:[await sprite()],scripts:[await script()]});
 assert.equal(bundle.models.length,1);assert.equal(bundle.scripts.length,1);
 const p=planBundlePrefabs(bundle,memory());assert.equal(p.conflicts.length,0);
 assert.equal(p.newPrefabs.length,1);
});
test('tampered source and duplicate IDs are rejected',async()=>{
 const tampered=await script();tampered.binary.sha256='0'.repeat(64);
 await assert.rejects(parseLibraryBundle({schema:'warlike.library.bundle.v2',version:2,items:[await sprite()],scripts:[tampered]}),/modifié/);
 await assert.rejects(parseLibraryBundle({schema:'warlike.library.bundle.v2',version:2,items:[await sprite(),await sprite()],scripts:[]}),/répétés/);
});