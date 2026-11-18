import test from 'node:test';
import assert from 'node:assert/strict';
import {uploadReflectionCubemap3d,reflectionRoughnessLod3d} from '../js/core/reflection-cubemap-gpu-3d.js';
const capture={size:16,faces:Array.from({length:6},(_,i)=>new Uint8Array(16*16*4).fill(i+1))};
function fakeGL(){
 const calls=[],gl={TEXTURE_BINDING_CUBE_MAP:34068,TEXTURE_CUBE_MAP:34067,TEXTURE_CUBE_MAP_POSITIVE_X:34069,RGBA:6408,UNSIGNED_BYTE:5121,TEXTURE_WRAP_S:10242,TEXTURE_WRAP_T:10243,TEXTURE_MAG_FILTER:10240,TEXTURE_MIN_FILTER:10241,CLAMP_TO_EDGE:33071,LINEAR:9729,LINEAR_MIPMAP_LINEAR:9987,NO_ERROR:0,
 getParameter:()=>null,createTexture:()=>({}),bindTexture:(...x)=>calls.push(['bind',...x]),texImage2D:(...x)=>calls.push(['face',...x]),texParameteri:()=>{},generateMipmap:(...x)=>calls.push(['mip',...x]),getError:()=>0,deleteTexture:()=>{}};return {gl,calls};
}
test('uploads the six real captured image faces and generates a mipmap chain',()=>{
 const {gl,calls}=fakeGL();const cube=uploadReflectionCubemap3d(gl,capture);
 assert.ok(cube);
 const faces=calls.filter(x=>x[0]==='face');
 assert.equal(faces.length,6);
 assert.deepEqual(faces.map(x=>x[1]),Array.from({length:6},(_,i)=>gl.TEXTURE_CUBE_MAP_POSITIVE_X+i));
 assert.deepEqual(faces.map(x=>x[9][0]),[1,2,3,4,5,6]);
 assert.equal(calls.filter(x=>x[0]==='mip').length,1);
});
test('rejects fake, partial or malformed scene capture data before GL allocation',()=>{
 const {gl,calls}=fakeGL();
 assert.throws(()=>uploadReflectionCubemap3d(gl,{size:16,faces:capture.faces.slice(0,5)}),/Six captured/);
 assert.throws(()=>uploadReflectionCubemap3d(gl,{size:16,faces:Array.from({length:6},()=>new Uint8Array(5))}),/Invalid captured/);
 assert.equal(calls.length,0);
});
test('roughness to mip level stays bounded and monotonic',()=>{
 assert.equal(reflectionRoughnessLod3d(0,64),0);
 assert.equal(reflectionRoughnessLod3d(1,64),6);
 assert.ok(reflectionRoughnessLod3d(.5,64)>reflectionRoughnessLod3d(.25,64));
});
