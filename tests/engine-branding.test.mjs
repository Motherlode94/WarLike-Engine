import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');

test('game editor identifies itself as WarLike Engine, never WarLike Studio',()=>{
 assert.match(html,/<html[^>]+data-warlike-app="warlike-engine"/);
 assert.match(html,/<title>WarLike Engine — Game Editor<\/title>/);
 assert.doesNotMatch(html,/WarLike Studio/i);
 assert.match(html,/WARLIKE <span>ENGINE<\/span>/);
});

test('Engine has its own dark PNG favicon',()=>{
 assert.match(html,/rel="icon"[^>]*href="\.\/favicon\.png\?v=20261125-dark"/);
 const png=readFileSync(new URL('../favicon.png',import.meta.url));
 assert.equal(png.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
 assert.ok(png.length>500);
});
