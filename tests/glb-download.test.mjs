import test from 'node:test';
import assert from 'node:assert/strict';
import {getModelGeometry,importedModels3d} from '../js/assets/real-models-3d.js';

test('GLB downloader rejects Content-Length beyond 25 MiB before buffering',async()=>{
 const id='test-oversize';
 importedModels3d.set(id,{id,name:'Oversize',shape:'glb',url:'https://example.invalid/big.glb'});
 const previous=globalThis.fetch;
 globalThis.fetch=async()=>({ok:true,headers:new Headers({'content-length':String(26*1024*1024)})});
 try{await assert.rejects(getModelGeometry(id),/25 Mo/)}
 finally{globalThis.fetch=previous;importedModels3d.delete(id)}
});
test('GLB downloader reports HTTP failures',async()=>{
 const id='test-404';
 importedModels3d.set(id,{id,name:'Missing',shape:'glb',url:'https://example.invalid/missing.glb'});
 const previous=globalThis.fetch;
 globalThis.fetch=async()=>({ok:false,status:404});
 try{await assert.rejects(getModelGeometry(id),/HTTP 404/)}
 finally{globalThis.fetch=previous;importedModels3d.delete(id)}
});
