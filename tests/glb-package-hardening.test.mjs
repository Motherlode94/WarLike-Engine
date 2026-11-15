import test from 'node:test';
import assert from 'node:assert/strict';
import {packageGlb} from '../js/assets/glb-package.js';

function glb(model,bin=new Uint8Array(4)){
 const json=new TextEncoder().encode(JSON.stringify(model));
 const jsonSize=Math.ceil(json.length/4)*4;
 const binSize=Math.ceil(bin.length/4)*4;
 const result=new Uint8Array(28+jsonSize+binSize),view=new DataView(result.buffer);
 view.setUint32(0,0x46546c67,true);view.setUint32(4,2,true);view.setUint32(8,result.length,true);
 view.setUint32(12,jsonSize,true);view.setUint32(16,0x4e4f534a,true);
 result.fill(32,20,20+jsonSize);result.set(json,20);
 view.setUint32(20+jsonSize,binSize,true);view.setUint32(24+jsonSize,0x004e4942,true);
 result.set(bin,28+jsonSize);return result.buffer;
}
const model=()=>({asset:{version:'2.0'},buffers:[{byteLength:4}],images:[{uri:'texture.png'}]});

test('packages an external image without losing GLB structure',async()=>{
 const input=glb(model());
 const output=await packageGlb(input,async()=>({bytes:new Uint8Array([137,80,78,71]),mimeType:'image/png'}));
 const view=new DataView(output),size=view.getUint32(12,true);
 const json=JSON.parse(new TextDecoder().decode(new Uint8Array(output,20,size)));
 assert.equal(view.getUint32(8,true),output.byteLength);
 assert.equal(json.images[0].uri,undefined);
 assert.equal(json.images[0].mimeType,'image/png');
 assert.equal(json.images[0].bufferView,0);
 assert.equal(json.buffers[0].byteLength,8);
});
test('rejects truncated chunk header and invalid binary bounds',async()=>{
 const input=glb(model());const truncated=new Uint8Array(input.byteLength+2);
 truncated.set(new Uint8Array(input));new DataView(truncated.buffer).setUint32(8,truncated.length,true);
 await assert.rejects(packageGlb(truncated.buffer),/incomplet/);
 const bad=glb({asset:{version:'2.0'},buffers:[{byteLength:9000}]});
 await assert.rejects(packageGlb(bad),/structure invalide/);
});
test('rejects invalid external texture payload',async()=>{
 await assert.rejects(packageGlb(glb(model()),async()=>({bytes:'not bytes',mimeType:'image/png'})),/Texture externe invalide/);
 await assert.rejects(packageGlb(glb(model()),async()=>({bytes:new Uint8Array([1]),mimeType:'text/plain'})),/Texture non prise en charge/);
});
test('rejects oversized raw input before inspecting it',async()=>{
 await assert.rejects(packageGlb(new ArrayBuffer(64*1024*1024+4)),/64 Mo/);
});
