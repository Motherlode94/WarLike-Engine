import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gameRuntimeFiles} from '../js/core/game-build.js';
const root=new URL('../',import.meta.url);
test('export runtime carries the two required WarLike design-system stylesheets',()=>{
 const manifest=JSON.parse(readFileSync(new URL('runtime-files.json',root),'utf8'));
 const files=['design-system/warlike-foundation.css','design-system/warlike-shell.css'];
 for(const file of files){
  assert.ok(manifest.files.includes(file),'manifest missing '+file);
  assert.ok(readFileSync(new URL(file,root)).length>0);
  const bundled=gameRuntimeFiles(manifest.files,{project:{},entities:[]});
  assert.ok(bundled.includes(file),'export filtered stylesheet '+file);
 }
});
