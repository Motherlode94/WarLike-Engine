import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('new Engine olive chrome is shipped with autonomous runtime',()=>{
 const html=read('index.html'),css=read('css/olive-editor-refinement.css'),manifest=JSON.parse(read('runtime-files.json'));
 assert.match(html,/olive-editor-refinement\.css/);
 assert.ok(manifest.files.includes('css/olive-editor-refinement.css'));
 assert.match(css,/warlike-engine/);
 assert.match(css,/--wl-accent/);
 assert.doesNotMatch(css,/canvas\s*\{|\.webgl\s*\{/);
});