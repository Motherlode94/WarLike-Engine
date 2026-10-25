import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../js/core/viewport-3d.js',import.meta.url),'utf8');
test('3D Play always updates physics before requiring a playable actor',()=>{
 const body=source.slice(source.indexOf('const update3dPlay=dt=>{'),source.indexOf(' const camera=()=>',source.indexOf('const update3dPlay=dt=>{')));
 assert.ok(body.includes('stepPhysics3d(state.entities,dt)'));
 assert.ok(body.includes('if(!p)return'));
 assert.ok(body.indexOf('stepPhysics3d(state.entities,dt)')<body.indexOf('if(!p)return'));
 assert.ok(body.indexOf('updateStats(state.entities,dt)')<body.indexOf('if(!p)return'));
});
