import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('Clean theme links after latest editor CSS and never restores demo UI',()=>{
 const index=read('index.html');
 assert.match(index,/clean-editor-no-demos\.css[^"]*"\s*><link rel="stylesheet" href="\.\/design-system\/warlike-clean\.css/);
 assert.doesNotMatch(index,/id="horror3dDemo"|id="rpgDemo"|id="warlikeDemoTools"|id="fpsScene"/);
 assert.match(index,/id="menuAddComponent"/);
 assert.match(index,/id="gameModeSelect"/);
});
test('Clean theme affects decorations, never editor geometry or rendering',()=>{
 const css=read('design-system/warlike-clean.css');
 assert.match(css,/--wl-bg:#FFFFFF/);
 assert.match(css,/color-scheme:light/);
 assert.doesNotMatch(css,/\b(?:width|height|top|left|right|bottom|position|display|padding|margin|transform|overflow|grid-template|flex-direction|font-size|line-height)\s*:/);
 assert.doesNotMatch(css,/\bcanvas\s*\{/);
});
