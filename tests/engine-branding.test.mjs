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
