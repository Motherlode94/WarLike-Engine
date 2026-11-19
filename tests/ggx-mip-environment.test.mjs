import test from 'node:test';
import assert from 'node:assert/strict';
import {createEnvironmentIbl3d,decodeRgbm3d} from '../js/core/environment-ibl-3d.js';
import {prefilterRadianceFace3d} from '../js/core/ibl-prefilter-3d.js';
test('every GGX mip of a constant HDR source preserves its linear radiance',()=>{
 for(const size of [16,8,4,2,1]){
  const bytes=prefilterRadianceFace3d(()=>[2,.5,1],4,size,{roughness:1-size/16,samples:16});
  for(let i=0;i<bytes.length;i+=4){const rgb=decodeRgbm3d(Array.from(bytes.subarray(i,i+4)));for(const [c,expected] of [2,.5,1].entries())assert.ok(Math.abs(rgb[c]-expected)<.035)}
 }
});
test('GGX broadens a directional highlight rather than mixing it with diffuse irradiance',()=>{
 const source=dir=>dir[2]>.97?[6,6,6]:[0,0,0];
 const sharp=prefilterRadianceFace3d(source,4,9,{roughness:0,samples:128});
 const rough=prefilterRadianceFace3d(source,4,9,{roughness:1,samples:128});
 const centre=(4*9+4)*4;
 assert.ok(decodeRgbm3d(Array.from(sharp.subarray(centre,centre+4)))[0]>5);
 assert.ok(decodeRgbm3d(Array.from(rough.subarray(centre,centre+4)))[0]<2);
 assert.ok(rough.some((v,i)=>i%4!==3&&i<centre&&v>0),'rough convolution spreads energy away from highlight centre');
});
test('GPU upload includes all six faces at every level and restores texture binding',()=>{
 const uploads=[],previous={name:'existing'},removed=[];let bound=previous;
 const gl={TEXTURE_CUBE_MAP:1,TEXTURE_BINDING_CUBE_MAP:2,TEXTURE_CUBE_MAP_POSITIVE_X:10,RGBA:20,UNSIGNED_BYTE:21,LINEAR:22,LINEAR_MIPMAP_LINEAR:23,
  createTexture:()=>({}),deleteTexture:t=>removed.push(t),getParameter:()=>bound,bindTexture:(_,t)=>bound=t,texParameteri(){},texImage2D(...a){uploads.push(a)}};
 const ibl=createEnvironmentIbl3d(gl,{sharpSize:8,diffuseSize:2});
 assert.equal(ibl.maxLod,3);assert.equal(uploads.length,6*4+6);assert.equal(bound,previous);
 for(let level=0;level<4;level++){const group=uploads.filter(a=>a[1]===level).slice(0,6);assert.equal(group.length,6);assert.ok(group.every(a=>a[3]===(8>>level)&&a[8].length===(8>>level)**2*4))}
 const calls=[];ibl.updateHdri({data:true},(_,face,size,options)=>{calls.push({face,size,...options});return new Uint8Array(size*size*4)});
 assert.equal(calls.length,30);assert.deepEqual([...new Set(calls.filter(c=>!c.diffuse).map(c=>c.roughness))],[0,1/3,2/3,1]);assert.equal(bound,previous);
 ibl.destroy();assert.equal(removed.length,2);
 assert.throws(()=>createEnvironmentIbl3d(gl,{sharpSize:7}),/Invalid/);
});
