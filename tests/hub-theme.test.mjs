import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const text=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('Hub exposes color inputs, palette and reset without changing engine colors',()=>{
 const html=text('index.html'),css=text('css/style.css');
 for(const id of ['hubAccentColor','hubAccentHex','hubThemePalette','hubThemeReset'])assert.ok(html.includes('id="'+id+'"'),id);
 assert.match(css,/\.hub-overlay\{--hub-accent/);
 assert.match(css,/\.hub-theme-swatch/);
});
test('Hub accent has validated hex colors and stores setting separately',()=>{
 const source=text('js/core/project-hub.js');
 assert.match(source,/normalizeHubAccent/);
 assert.match(source,/\^#\[0-9a-f\]\{6\}\$/);
 assert.match(source,/warlike\.hub\.accent\.v1/);
 assert.match(source,/hubAccentPresets/);
 assert.match(source,/commitAccent\(currentAccent\(\)\)/);
});
