import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../js/core/viewport-3d.js',import.meta.url),'utf8');
test('FPS/TPS mouse rotation has an unlocked pointer path and play-only guard',()=>{
 assert.match(source,/canvas\.addEventListener\('pointermove',e=>\{if\(document\.pointerLockElement!==canvas\)applyMouseLook\(e\)/);
 assert.match(source,/const shouldMouseLook=\(\)=>state\.playing/);
 assert.match(source,/!companyController\(state\.entities\)/);
 assert.match(source,/view3d\.yaw-=dx\*sensitivity/);
});
test('FPS click only aims and no longer fires or requests pointer lock',()=>{
 assert.match(source,/if\(isFps\(\)\)\{if\(e\.button===0\|\|e\.button===2\)\{e\.preventDefault\(\);fpsAiming=true;/);
 assert.doesNotMatch(source,/fpsMouseDown/);
 assert.doesNotMatch(source,/canvas\.requestPointerLock/);
 assert.match(source,/input\.has\('f'\)/);
});
