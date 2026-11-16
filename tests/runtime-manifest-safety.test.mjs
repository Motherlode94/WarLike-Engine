import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,symlink,readFile,rm} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import path from 'node:path';

const roots=['js','css','design-system','src','assets','vendor','examples/community','examples/worldforge','script-editor'];
const required=['index.html','python/lan_server.py','python/warlike.py','start-warlike-multi.cmd'];
const scriptSource=await readFile(new URL('../scripts/build-runtime-manifest.mjs',import.meta.url),'utf8');
async function fixture(){
 const root=await mkdtemp(path.join(tmpdir(),'warlike-manifest-'));
 for(const dir of [...roots,'python','scripts'])await mkdir(path.join(root,dir),{recursive:true});
 for(const file of required)await writeFile(path.join(root,file),'fixture');
 await writeFile(path.join(root,'scripts/build-runtime-manifest.mjs'),scriptSource);
 return root;
}
async function run(root){
 return spawnSync(process.execPath,[path.join(root,'scripts/build-runtime-manifest.mjs')],{encoding:'utf8',timeout:5000});
}
test('runtime export excludes external symlink files and symlink directories',async()=>{
 const root=await fixture();
 try{
  await writeFile(path.join(root,'js','safe.js'),'safe');
  await writeFile(path.join(root,'js','ignore.exe'),'blocked');
  const external=path.join(root,'outside.txt');
  await writeFile(external,'not in export');
  await symlink(external,path.join(root,'js','linked.txt'));
  await symlink(path.join(root,'python'),path.join(root,'assets','linked-folder'),'dir');
  const result=await run(root);
  assert.equal(result.status,0,result.stderr);
  const {files}=JSON.parse(await readFile(path.join(root,'runtime-files.json'),'utf8'));
  assert.ok(files.includes('js/safe.js'));
  assert.ok(!files.some(file=>file.includes('linked')||file.endsWith('.exe')));
  assert.equal(new Set(files).size,files.length);
  assert.deepEqual(files,[...files].sort());
 }finally{await rm(root,{recursive:true,force:true});}
});
test('runtime manifest fails rather than following a symlink for required index',async()=>{
 const root=await fixture();
 try{
  await rm(path.join(root,'index.html'));
  await symlink(path.join(root,'python/warlike.py'),path.join(root,'index.html'));
  const result=await run(root);
  assert.notEqual(result.status,0);
  assert.match(result.stderr,/not a regular file/);
 }finally{await rm(root,{recursive:true,force:true});}
});
