import test from 'node:test';
import assert from 'node:assert/strict';
import {samplePlatformMotion} from '../js/core/physics-2d.js';
test('platform ping-pong is deterministic',()=>{const a={x:0,y:2},b={x:10,y:2};assert.deepEqual(samplePlatformMotion(a,b,3,2),{x:5,y:2});assert.deepEqual(samplePlatformMotion(a,b,4,2),a);assert.equal(samplePlatformMotion(a,b,1,0),null);});
