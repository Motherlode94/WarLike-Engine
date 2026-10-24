import test from 'node:test';
import assert from 'node:assert/strict';
import {findEnginePath,nativeStatus} from '../js/core/native-3d.js';

test('C++ bridge preserves functioning JS pathfinding without deployed WebAssembly',()=>{
 const points=findEnginePath({x:0,y:0},{x:180,y:0},[{x:60,y:-20,w:55,h:85}],{cellSize:24,maxNodes:1000});
 assert.ok(points.length>0);
 assert.equal(points.at(-1).x,180);
 assert.equal(points.at(-1).y,0);
 assert.equal(nativeStatus(),'idle');
});
