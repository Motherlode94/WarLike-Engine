import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const shader=readFileSync(new URL('../js/core/viewport-3d.js',import.meta.url),'utf8');
test('3D horror flashlight uses a powered shader cone',()=>{
 for(const token of ['uFlashPos','uFlashDir','uFlashPower','flashCone','flashFalloff','horror.flashlight','horror.battery>0'])assert.ok(shader.includes(token),token);
});
test('3D horror readout exposes battery and fear during gameplay',()=>{
 assert.match(shader,/horror3dHud/);
 assert.match(shader,/Math\.round\(horror\.fear\)/);
});
