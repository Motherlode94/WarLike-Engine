import test from 'node:test';
import assert from 'node:assert/strict';
import {decodeRadianceHdr,sampleEquirectHdr} from '../js/core/hdr-radiance-3d.js';
import {prefilterHdriFace3d,radicalInverse2,ggxHalfVector3d} from '../js/core/ibl-prefilter-3d.js';
const ascii=x=>new TextEncoder().encode(x);
const makeHdr=(width,height,{rle=false}={})=>{
 const header=ascii('#?RADIANCE\nFORMAT=32-bit_rle_rgbe\n\n-Y '+height+' +X '+width+'\n');
 const bytes=[...header];
 for(let y=0;y<height;y++){
  if(rle){
   bytes.push(2,2,width>>8,width&255);
   for(const color of [160,64,32,130])bytes.push(128+width,color);
  }else for(let x=0;x<width;x++)bytes.push(160,64,32,130);
 }
 return new Uint8Array(bytes);
};
test('Radiance HDR parser decodes legacy RGBE and adaptive four-channel RLE',()=>{
 for(const rle of [false,true]){
  const hdr=decodeRadianceHdr(makeHdr(8,2,{rle}));
  assert.equal(hdr.width,8);assert.equal(hdr.height,2);assert.equal(hdr.data.length,48);
  assert.ok(hdr.data.every(Number.isFinite));
  assert.ok(Math.abs(hdr.data[0]-2.5)<1e-9);
  assert.ok(Math.abs(hdr.data[1]-1)<1e-9);
  const pixel=sampleEquirectHdr(hdr,[1,0,0]);
  assert.ok(Math.abs(pixel[0]-2.5)<1e-9);
 }
});
test('rejects unsupported RGBE headers, excessive dimensions and malformed RLE',()=>{
 assert.throws(()=>decodeRadianceHdr(ascii('not a hdr')),/HDR/);
 const bad=ascii('#?RADIANCE\nFORMAT=32-bit_rle_rgbe\n\n-Y 999999 +X 999999\n');
 assert.throws(()=>decodeRadianceHdr(bad),/large/);
 const truncated=makeHdr(8,2,{rle:true}).subarray(0,-3);
 assert.throws(()=>decodeRadianceHdr(truncated),/truncated|Invalid HDR RLE/);
});
test('GGX and diffuse prefilter return finite RGBM cube faces',()=>{
 const hdr=decodeRadianceHdr(makeHdr(8,2));
 for(const settings of [{roughness:.1,samples:16},{roughness:.9,samples:16},{diffuse:true,samples:24}]){
  const face=prefilterHdriFace3d(hdr,4,8,settings);
  assert.equal(face.length,8*8*4);
  assert.ok(face.some(x=>x>0));
 }
 assert.equal(radicalInverse2(0),0);
 assert.ok(ggxHalfVector3d(.2,.5,.5).every(Number.isFinite));
});
