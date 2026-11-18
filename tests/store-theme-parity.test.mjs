import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('the Store semantic theme tokens drive this application's legacy UI',()=>{
 const css=read('css/store-theme-parity.css'),html=read('index.html');
 assert.ok(html.includes('css/store-theme-parity.css'));
 for(const token of ['--wl-bg','--wl-surface','--wl-sidebar','--wl-fg','--wl-accent','--wl-border'])assert.ok(css.includes(token),token);
 assert.match(css,/data-wl-theme/);
 const manifest=JSON.parse(read('runtime-files.json'));assert.ok(manifest.files.includes('css/store-theme-parity.css'));assert.ok(!css.includes('canvas{'));
});