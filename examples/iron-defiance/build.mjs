// Produces an offline, distributable Web build. Requires npm install in this folder.
import {build} from 'esbuild';
import {mkdir,copyFile,readFile,writeFile,readdir,stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url)),out=path.join(root,'dist');
await mkdir(out,{recursive:true});
await build({entryPoints:[path.join(root,'game.js')],bundle:true,format:'esm',outfile:path.join(out,'game.js'),target:['es2022'],minify:true,legalComments:'inline',loader:{'.glb':'file'}});
let html=await readFile(path.join(root,'index.html'),'utf8');
html=html.replace(/<script type="importmap">[\s\S]*?<\/script>/,'');
await writeFile(path.join(out,'index.html'),html);
await copyFile(path.join(root,'game-rules.js'),path.join(out,'game-rules.js'));
const models=path.join(root,'models'),installed=[];
try{for(const name of await readdir(models)){if(/^ID-(INF|ARM|LOG|DRN|ENV)-\d{2}\.glb$/i.test(name)){await mkdir(path.join(out,'models'),{recursive:true});await copyFile(path.join(models,name),path.join(out,'models',name));installed.push(name);}}}catch(e){if(e.code!=='ENOENT')throw e}
if(installed.length)await writeFile(path.join(out,'models/manifest.json'),JSON.stringify({version:1,files:installed})+'\n');
const stats=await stat(path.join(out,'game.js'));console.log('CENDRE-01 offline Web bundle generated: '+stats.size+' bytes');
