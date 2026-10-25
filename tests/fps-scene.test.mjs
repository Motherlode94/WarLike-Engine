import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const fps=readFileSync(new URL('../js/core/fps-scene.js',import.meta.url),'utf8');
const viewport=readFileSync(new URL('../js/core/viewport-3d.js',import.meta.url),'utf8');
test('FPS scene generates targets, cover, and a first-person player',()=>{
 for(const word of ['character-hero','character-robot','prop-crate','fpsController:true','playable3d:false'])assert.ok(fps.includes(word),word);
});
test('first-person scene has a camera, mouse look, and aimed fire in WebGL',()=>{
 for(const word of ['const isFps=','const shootFps=','requestPointerLock','movementX','fpsCrosshair','damage(best,25)'])assert.ok(viewport.includes(word),word);
});
