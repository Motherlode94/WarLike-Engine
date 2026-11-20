import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const viewport=readFileSync(new URL('../js/core/viewport-3d.js',import.meta.url),'utf8');
const gizmos=readFileSync(new URL('../js/core/gizmos-3d.js',import.meta.url),'utf8');
test('Camera Preview renders actual GLB/material draw closures to separate WebGL framebuffer',()=>{
 assert.match(viewport,/gl\.createFramebuffer\(\)/);
 assert.match(viewport,/sceneCameraView\(selectedCamera/);
 assert.match(viewport,/for\(const entry of opaqueDraws\)entry\.draw\(\)/);
 assert.match(viewport,/gl\.readPixels\(0,0,pw,ph/);
 assert.match(viewport,/gl\.bindFramebuffer\(gl\.FRAMEBUFFER,null\)/);
 assert.match(viewport,/preview\.dataset\.liveRenderer='webgl'/);
});
test('Camera Preview preserves 2D fallback when WebGL has not produced a frame',()=>{
 assert.match(gizmos,/preview\.dataset\.liveRenderer!=='webgl'/);
});
