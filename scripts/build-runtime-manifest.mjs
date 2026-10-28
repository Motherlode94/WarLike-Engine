import {readdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const walk=async dir=>{const result=[];for(const entry of await readdir(path.join(root,dir),{withFileTypes:true})){const name=dir+'/'+entry.name;if(entry.isDirectory())result.push(...await walk(name));else if(/\.(js|css|svg|png|jpg|jpeg|webp|glb|json|md|txt|ogg|mp3|wav)$/.test(name))result.push(name)}return result};
const files=['index.html'];for(const dir of ['js','css','src','assets','vendor','examples/community'])files.push(...await walk(dir));
await writeFile(path.join(root,'runtime-files.json'),JSON.stringify({version:1,files:files.sort()},null,2)+'\n');
console.log(files.length+' fichiers pour l’export Web.');
