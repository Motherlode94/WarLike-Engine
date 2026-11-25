import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../js/ui/tilemap-editor-2d.js',import.meta.url),'utf8');
test('2D-only Tilemap toolbar uses both hidden and explicit display state',()=>{
 assert.match(source,/workspace\.mode==='2d'&&!state\.playing/);
 assert.match(source,/bar\.hidden=!visible/);
 assert.match(source,/bar\.style\.display=visible\?'flex':'none'/);
});
