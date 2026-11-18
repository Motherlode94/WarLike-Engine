import test from 'node:test';
import assert from 'node:assert/strict';
import {encodeRgbm3d,decodeRgbm3d,cubeDirection3d,proceduralRadiance3d,buildEnvironmentFace3d} from '../js/core/environment-ibl-3d.js';
test('RGBM encodes radiance above 1.0 in RGBA8 with bounded reconstruction error',()=>{
 for(const rgb of [[0,0,0],[.1,.3,.5],[1.5,2.1,3.2],[6,.5,2],[8,8,8]]){
  const encoded=encodeRgbm3d(rgb),decoded=decodeRgbm3d(encoded);
  assert.equal(encoded.length,4);
  assert.ok(encoded.every(v=>Number.isInteger(v)&&v>=0&&v<=255));
  decoded.forEach((v,i)=>assert.ok(Math.abs(v-rgb[i])<.06,`${rgb[i]} => ${v}`));
 }
});
test('cubemap faces have normalised directions and consistent centres',()=>{
 const expected=[[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];
 for(let i=0;i<6;i++){
  const actual=cubeDirection3d(i,0,0);
  assert.deepEqual(actual,expected[i]);
  assert.ok(Math.abs(Math.hypot(...cubeDirection3d(i,.62,-.8))-1)<1e-12);
 }
});
test('HDR sky produces directional radiance and encoded face dimensions are exact',()=>{
 const sun=[0,0,1],options={sunDirection:sun,sunColor:[1,.8,.6],sunIntensity:2};
 const lit=proceduralRadiance3d(sun,options),dark=proceduralRadiance3d([0,0,-1],options);
 assert.ok(lit[0]>dark[0]+4,'Sun must create an HDR hotspot');
 const pixels=buildEnvironmentFace3d(4,16,options);
 assert.equal(pixels.length,16*16*4);
 assert.ok(pixels.some(v=>v!==0));
});
