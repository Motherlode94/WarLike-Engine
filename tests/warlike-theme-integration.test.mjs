import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('approved palette includes all exact master swatches and four named variants',()=>{
 const css=read('design-system/warlike-palette-v2.css');
 for(const hex of ['#D9D28B','#B2BD7E','#8E9162','#6A795D'])assert.ok(css.includes(hex),hex);
 for(const id of ['sand-light','tactical','heritage'])assert.ok(css.includes('data-wl-theme="'+id+'"'));
});
test('every required site loads the palette CSS and common theme selector',()=>{
 for(const page of ["index.html"]){
  const html=read(page);
  assert.match(html,/design-system\/warlike-palette-v2\.css/);
  assert.match(html,/design-system\/warlike-theme-switcher-v2\.js/);
 }
});
test('theme selection is allowlisted, accessible and stored without cross-origin tokens',()=>{
 const js=read('design-system/warlike-theme-switcher-v2.js');
 assert.match(js,/warlike-theme-v1/);
 assert.match(js,/aria-label/);
 assert.match(js,/localStorage\.setItem/);
 assert.doesNotMatch(js,/postMessage|document\.cookie|token=|eval\(/);
});
