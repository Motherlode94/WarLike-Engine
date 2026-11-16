import {readdir,writeFile,lstat} from 'node:fs/promises';
import path from 'node:path';

// Generate only files located inside the project: linked files and directories
// must never leak host files or make the export depend on machine-specific paths.
const root=path.resolve(import.meta.dirname,'..');
const walk=async dir=>{
 const result=[];
 const entries=await readdir(path.join(root,dir),{withFileTypes:true});
 for(const entry of entries){
  if(entry.isSymbolicLink())continue;
  const name=dir+'/'+entry.name;
  if(entry.isDirectory())result.push(...await walk(name));
  else if(entry.isFile()&&/\.(html|js|mjs|wasm|css|svg|png|jpg|jpeg|webp|glb|json|md|txt|ogg|mp3|wav)$/i.test(name))result.push(name);
 }
 return result;
};
const requiredFiles=['index.html','python/lan_server.py','python/warlike.py','start-warlike-multi.cmd'];
const requiredDirs=['js','css','design-system','src','assets','vendor','examples/community','examples/worldforge','script-editor'];
for(const file of requiredFiles){
 const info=await lstat(path.join(root,file));
 if(!info.isFile())throw new Error('Required runtime file is not a regular file: '+file);
}
const files=[...requiredFiles];
for(const dir of requiredDirs)files.push(...await walk(dir));
try{
 const info=await lstat(path.join(root,'native/dist'));
 if(info.isDirectory())files.push(...await walk('native/dist'));
}catch(error){if(error?.code!=='ENOENT')throw error;}
const unique=[...new Set(files)].sort();
await writeFile(path.join(root,'runtime-files.json'),JSON.stringify({version:1,files:unique},null,2)+'\n');
console.log(unique.length+' fichiers pour l’export Web.');
