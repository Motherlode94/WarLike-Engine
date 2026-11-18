import test from 'node:test';
import assert from 'node:assert/strict';
import {REFLECTION_CUBE_FACES_3D,reflectionProbeCaptureOptions3d,captureReflectionProbe3d} from '../js/core/reflection-probe-capture-3d.js';
import {environmentProbeUniforms3d} from '../js/core/environment-probes-3d.js';

test('reflection capture has six distinct 90 degree axes',()=>{
 assert.equal(REFLECTION_CUBE_FACES_3D.length,6);
 assert.equal(new Set(REFLECTION_CUBE_FACES_3D.map(f=>f.direction.join(','))).size,6);
 assert.throws(()=>reflectionProbeCaptureOptions3d({position:[0,0,0],size:30}),/power of two/);
});
test('reflection probe capture obtains six real scene RGBA views in correct order',async()=>{
 const seen=[],size=16;
 const captured=await captureReflectionProbe3d({position:[1,2,3],size,renderFace:async view=>{
  seen.push(view);
  return new Uint8Array(size*size*4).fill(view.face+1);
 }});
 assert.deepEqual(seen.map(v=>v.name),['+X','-X','+Y','-Y','+Z','-Z']);
 assert.ok(seen.every(v=>v.fieldOfView===90&&v.aspect===1));
 assert.deepEqual(captured.faces.map(face=>face[0]),[1,2,3,4,5,6]);
 assert.equal(captured.faces[0].length,size*size*4);
});
test('reflection capture rejects missing renderer, invalid readback and cancelled capture',async()=>{
 await assert.rejects(captureReflectionProbe3d({position:[0,0,0]}),/renderer/);
 await assert.rejects(captureReflectionProbe3d({position:[0,0,0],size:16,renderFace:()=>new Uint8Array(8)}),/invalid RGBA/);
 const controller=new AbortController();controller.abort();
 await assert.rejects(captureReflectionProbe3d({position:[0,0,0],size:16,signal:controller.signal,renderFace:()=>new Uint8Array(1024)}),/aborted/);
});
test('environment probes select four closest to the active camera',()=>{
 const entities=Array.from({length:6},(_,i)=>({x:i*640,y:0,w:64,h:64,depth3d:64,environmentProbe3d:{enabled:true,radius:8,strength:1,tint:'#ffffff'}}));
 const result=environmentProbeUniforms3d(entities,{observer:[50.5,.5,.5]});
 assert.equal(result.count,4);
 assert.equal(result.positions[0],50.5);
 assert.deepEqual(Array.from(result.positions.slice(0,12).filter((_,i)=>i%3===0)),[50.5,40.5,30.5,20.5]);
});
