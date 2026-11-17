import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {gameBuildHtml,gameRuntimeFiles} from '../js/core/game-build.js';
// A portable Web game's entrypoint must resolve relative to its own export
// folder, not to the editor or a CDN. This specifically guards the former
// /camera/js/editor.js 404 regression in P0 issue #47.
const root=new URL('../',import.meta.url);
const [template,manifest]=await Promise.all([
 readFile(new URL('../index.html',import.meta.url),'utf8'),
 readFile(new URL('../runtime-files.json',import.meta.url),'utf8').then(JSON.parse)
]);
const data={project:{title:'P0 smoke test',scenes:[]}};
test('game export boot script is inside every isolated scene subdirectory',()=>{
 const built=gameBuildHtml(template,data);
 assert.match(built,/<script type="module" src="\.\/js\/game-build-player\.js"><\/script>/);
 assert.doesNotMatch(built,/<script\b[^>]*type="module"[^>]*src="[^"]*js\/editor\.js/);
 assert.ok(built.includes('id="warlikeGameData"'));
 for(const folder of ['/camera/','/route/','/exports/2d/','/exports/3d/']){
  const base=new URL('http://localhost:8000'+folder);
  const entry=new URL('./js/game-build-player.js',base);
  const editor=new URL('./editor.js',entry);
  assert.equal(entry.pathname,folder+'js/game-build-player.js');
  assert.equal(editor.pathname,folder+'js/editor.js');
 }
});
test('export contains boot and editor dependency modules (no bare CDN dependency)',async()=>{
 assert.ok(Array.isArray(manifest.files));
 const files=new Set(gameRuntimeFiles(manifest.files,{project:{scenes:[]}}));
 for(const name of ['index.html','js/game-build-player.js','js/editor.js','js/core/runtime-session.js']){
  assert.ok(files.has(name),'Missing required export runtime file '+name);
  const source=await readFile(new URL('../'+name,import.meta.url));
  assert.ok(source.length>0,name+' must not be empty');
 }
 const boot=await readFile(new URL('../js/game-build-player.js',import.meta.url),'utf8');
 assert.match(boot,/await import\(['"]\.\/editor\.js['"]\)/);
 assert.doesNotMatch(boot,/await import\(['"]\/(?:editor|camera)\//);
});
