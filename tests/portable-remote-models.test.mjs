import test from 'node:test';
import assert from 'node:assert/strict';
import {portableRemoteModelBytes,portableRemoteModelDescriptor} from '../js/core/portable-remote-models.js';
import {exportGamePackage} from '../js/core/game-build.js';
import {freshGameProject} from '../js/core/game-project.js';
import {parseGlb} from '../js/assets/real-models-3d.js';

function externalTextureGlb(uri='textures/paint.png?revision=2'){
 const bin=new Uint8Array(60),dv=new DataView(bin.buffer);
 [0,0,0,1,0,0,0,1,0,0,0,1,0,0,1,0].forEach((x,i)=>{if(i<9)dv.setFloat32(i*4,x,true)});
 [0,0,1,0,0,1].forEach((x,i)=>dv.setFloat32(36+i*4,x,true));
 const json={asset:{version:'2.0'},scene:0,scenes:[{nodes:[0]}],nodes:[{mesh:0}],
  meshes:[{primitives:[{attributes:{POSITION:0,TEXCOORD_0:1},material:0}]}],
  accessors:[{bufferView:0,componentType:5126,type:'VEC3',count:3},
   {bufferView:1,componentType:5126,type:'VEC2',count:3}],
  bufferViews:[{buffer:0,byteOffset:0,byteLength:36},{buffer:0,byteOffset:36,byteLength:24}],
  buffers:[{byteLength:bin.byteLength}],
  materials:[{pbrMetallicRoughness:{baseColorTexture:{index:0}}}],
  textures:[{source:0}],images:[{uri}]};
 const encoded=new TextEncoder().encode(JSON.stringify(json)),pad=Math.ceil(encoded.length/4)*4;
 const result=new Uint8Array(28+pad+bin.length),view=new DataView(result.buffer);
 view.setUint32(0,0x46546c67,true);view.setUint32(4,2,true);view.setUint32(8,result.length,true);
 view.setUint32(12,pad,true);view.setUint32(16,0x4e4f534a,true);
 result.fill(32,20,20+pad);result.set(encoded,20);
 view.setUint32(20+pad,bin.length,true);view.setUint32(24+pad,0x004e4942,true);result.set(bin,28+pad);
 return result.buffer;
}
const asset={id:'real-specular-test',name:'Portable QA model',category:'Props',shape:'glb',
 license:'CC0',url:'https://models.example.org/props/paint.glb'};
const png=new Uint8Array([137,80,78,71,13,10,26,10,0,0,0,0]);
const resource=(bytes,type='model/gltf-binary')=>new Response(bytes,{status:200,headers:{'content-type':type}});
function mock(fetches,{missing=false}={}){
 return async url=>{
  const href=String(url);fetches.push(href);
  if(href===asset.url)return resource(externalTextureGlb());
  if(href==='https://models.example.org/props/textures/paint.png?revision=2'){
   if(missing)return new Response('',{status:404});
   return resource(png,'image/png');
  }
  throw Error('Unexpected '+href);
 };
}
test('remote GLB and relative base-color image become a self-contained offline GLB',async()=>{
 const fetched=[];
 const {descriptor,bytes}=await portableRemoteModelBytes(asset,{fetcher:mock(fetched)});
 assert.equal(descriptor.url,'./assets/remote/real-specular-test.glb');
 assert.equal(descriptor.license,'CC0');
 assert.deepEqual(fetched,[asset.url,'https://models.example.org/props/textures/paint.png?revision=2']);
 const encoded=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
 const jsonLength=encoded.getUint32(12,true);
 const gltf=JSON.parse(new TextDecoder().decode(bytes.slice(20,20+jsonLength)));
 assert.equal(gltf.images[0].uri,undefined);
 assert.equal(gltf.images[0].mimeType,'image/png');
 assert.ok(Number.isInteger(gltf.images[0].bufferView));
 assert.ok(gltf.buffers[0].byteLength>=60+png.byteLength);
 const parsed=parseGlb(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength));
 assert.equal(parsed.triangleCount,1);
 assert.deepEqual([...parsed.parts[0].texture.bytes],Array.from(png));
 assert.deepEqual(parsed.materialWarnings,[]);
});
test('remote missing sidecar blocks export instead of producing a white model',async()=>{
 await assert.rejects(
  ()=>portableRemoteModelBytes(asset,{fetcher:mock([],{missing:true})}),
  /Téléchargement du modèle\/texture.*HTTP 404/
 );
});
test('remote texture traversal, external host and unsupported IDs are rejected',async()=>{
 for(const uri of ['https://another.example.org/paint.png','javascript:alert(1)']){
  await assert.rejects(()=>portableRemoteModelBytes(asset,{fetcher:async url=>{
   if(String(url)===asset.url)return resource(externalTextureGlb(uri));
   throw Error('Unexpected resource '+url);
  }}),/Texture externe invalide/);
 }
 assert.throws(()=>portableRemoteModelDescriptor({...asset,id:'../../unsafe'}),/Identifiant/);
});
test('portable Web ZIP includes a local remote GLB and replaces the remote catalog URL',async()=>{
 const calls=[];
 const files=['index.html','js/assets/imported-models-3d.js'];
 const fetcher=async url=>{
  const value=String(url);
  if(value.endsWith('/runtime-files.json'))return resource(JSON.stringify({files}),'application/json');
  if(value.endsWith('/index.html'))return resource('<html><head><title>Engine</title></head><body><script type="module" src="./js/editor.js"></script></body></html>','text/html');
  if(value.endsWith('/js/assets/imported-models-3d.js'))return resource('export const packagedModels3d=[];','text/javascript');
  return mock(calls)(url);
 };
 const scene=[{id:1,type:'mesh3d',name:'Hero',x:0,y:0,w:64,h:64,depth3d:64,playable3d:true},
  {id:2,type:'mesh3d',name:'Painted',x:100,y:100,w:64,h:64,depth3d:64,model3dId:'real-specular-test'}];
 const original=structuredClone(scene);
 const result=await exportGamePackage({entities:scene,mode:'3d',project:{...freshGameProject(),genre:'sandbox'}},{fetcher});
 const bytes=new Uint8Array(await result.blob.arrayBuffer()),str=new TextDecoder('latin1').decode(bytes);
 assert.ok(str.includes('assets/remote/real-specular-test.glb'),'ZIP must contain locally packed model');
 assert.ok(str.includes('./assets/remote/real-specular-test.glb'),'Packaged catalog must point to local copy');
 assert.deepEqual(scene,original,'Build must not mutate editor scene');
 assert.deepEqual(calls,[asset.url,'https://models.example.org/props/textures/paint.png?revision=2']);
});
