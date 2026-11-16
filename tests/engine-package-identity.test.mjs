import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const pkg=JSON.parse(readFileSync(new URL('../package.json',import.meta.url),'utf8'));
test('Engine has distinct package identity from Studio',()=>{
 assert.equal(pkg.name,'warlike-engine');
 assert.notEqual(pkg.name,'warlike-studio');
 assert.equal(pkg.private,true);
});
test('Engine development safety scripts remain available',()=>{
 for(const script of ['test','typecheck','test:export','test:export:browser','test:chambre07:browser'])assert.ok(pkg.scripts?.[script],script);
});
