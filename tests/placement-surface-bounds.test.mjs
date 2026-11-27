import test from 'node:test';
import assert from 'node:assert/strict';
import {raycastPlacementBox3d} from '../js/core/viewport-3d.js';
const q={x:0,y:0,z:0,w:1},box={x:0,y:-2,z:0,w:2,h:2,d:2};
test('surface below zero has actual top elevation',()=>{const h=raycastPlacementBox3d([0,5,0],[0,-1,0],box,q);assert.deepEqual(h.point,[0,-1,0]);assert.deepEqual(h.normal,[0,1,0])});
test('ray outside box misses',()=>assert.equal(raycastPlacementBox3d([2,5,0],[0,-1,0],box,q),null));
