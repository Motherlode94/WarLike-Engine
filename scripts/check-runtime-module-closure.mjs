// Verify that every statically referenced JS module in the portable game build
// actually exists in the committed export manifest. No network access required.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
const root=new URL('../',import.meta.url);
const manifest=JSON.parse(await readFile(new URL('../runtime-files.json',import.meta.url),'utf8'));
assert.ok(Array.isArray(manifest.files),'Invalid runtime manifest');
const included=new Set(manifest.files);
const errors=[],seen=new Set(),queue=['js/game-build-player.js','js/editor.js'];
const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
for(const match of html.matchAll(/<script\b[^>]*type=["']module["'][^>]*src=["']([^"']+)["'][^>]*>/g)){
 const entry=match[1].replace(/^\.\//,'').split(/[?#]/)[0];
 if(entry.endsWith('.js'))queue.push(entry);
}
const imports=source=>{
 const specifiers=[];
 // Static import/export-from and side-effect imports, plus literal dynamic imports.
 const patterns=[
  /\b(?:import|export)\s+(?:[^;'"]*?\s+from\s*)?["'](\.{1,2}\/[^"']+)["']/g,
  /\bimport\s*\(\s*["'](\.{1,2}\/[^"']+)["']\s*\)/g
 ];
 for(const re of patterns)for(const match of source.matchAll(re))specifiers.push(match[1]);
 return specifiers;
};
while(queue.length){
 const file=queue.shift();
 if(seen.has(file))continue;
 seen.add(file);
 if(!included.has(file)){errors.push('Not in portable manifest: '+file);continue;}
 let source;
 try{source=await readFile(new URL('../'+file,import.meta.url),'utf8')}
 catch{errors.push('Referenced module does not exist: '+file);continue}
 for(const specifier of imports(source)){
  const bare=specifier.split(/[?#]/)[0];
  if(!/\.m?js$/.test(bare))continue;
  const target=path.posix.normalize(path.posix.join(path.posix.dirname(file),bare));
  if(target.startsWith('../')||target.startsWith('/')||target==='..'){errors.push('Import escapes project: '+file+' -> '+specifier);continue}
  if(!included.has(target))errors.push('Missing dependency: '+file+' -> '+target);
  else if(!seen.has(target))queue.push(target);
 }
}
assert.deepEqual(errors,[],errors.join('\n'));
console.log('Portable Web export module closure OK: '+seen.size+' JS modules verified.');
