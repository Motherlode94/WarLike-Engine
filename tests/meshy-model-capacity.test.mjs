import test from 'node:test';
import assert from 'node:assert/strict';
import {MAX_IMPORTED_GLB_BYTES,MAX_SCENE_MODEL_BYTES,MAX_MODEL_BASE64_LENGTH} from '../js/assets/model-capacity.js';
import {registerLocalModel,importedModels3d,parseGlb} from '../js/assets/real-models-3d.js';
test('Meshy high-detail GLB budgets are 64 MiB each and 256 MiB per scene',()=>{
 assert.equal(MAX_IMPORTED_GLB_BYTES,64*1024*1024);
 assert.equal(MAX_SCENE_MODEL_BYTES,256*1024*1024);
 assert.ok(MAX_MODEL_BASE64_LENGTH>=Math.ceil(MAX_IMPORTED_GLB_BYTES/3)*4);
});
test('GLB registration accepts files larger than former 25 MiB cap but rejects >64 MiB',()=>{
 const accepted=registerLocalModel({name:'meshy-large.glb',size:32*1024*1024});
 assert.equal(accepted.shape,'glb');importedModels3d.delete(accepted.id);
 assert.throws(()=>registerLocalModel({name:'meshy-oversize.glb',size:65*1024*1024}),/64 Mo/);
});
test('GLB parser guards allocated buffers over 64 MiB before decoding',()=>{
 assert.throws(()=>parseGlb(new ArrayBuffer(MAX_IMPORTED_GLB_BYTES+1)),/64 Mo/);
});
