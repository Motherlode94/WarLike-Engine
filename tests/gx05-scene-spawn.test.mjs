import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveSceneSpawn} from '../js/core/scene-progress.js';
test('spawn resolves enabled scene markers only',()=>{const es=[{id:1,assetId:'spawn-pad',x:3,y:4},{id:2,assetId:'checkpoint',x:0,y:0,elementEnabled:false}];assert.deepEqual(resolveSceneSpawn(es,1),{x:3,y:4,elevation3d:0});assert.equal(resolveSceneSpawn(es,2),null);});
