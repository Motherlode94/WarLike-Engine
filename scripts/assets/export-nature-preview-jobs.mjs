// Decode local GLBs through the engine, without a browser or remote resources.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve,join} from 'node:path';
import {parseGlb} from '../../js/assets/real-models-3d.js';
const root=fileURLToPath(new URL('../../',import.meta.url));
const output=resolve(process.argv[2]||'/tmp/warlike-nature-previews');await mkdir(output,{recursive:true});
const all=(await Promise.all(['kenney','quaternius'].map(async p=>JSON.parse(await readFile(join(root,'assets/free',p,'models.json'),'utf8'))))).flat();
// Original official WebP previews are retained. Rebuild generated PNG previews.
const assets=all.filter(a=>a.category==='Nature'&&a.thumbnailUrl.endsWith('.png'));const jobs=[];
for(const asset of assets){
 const url=new URL(asset.url,new URL('../../',import.meta.url)),bytes=await readFile(url);
 const mesh=parseGlb(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.length),{baseUrl:url.href});const parts=[];
 for(let i=0;i<mesh.parts.length;i++){
  const p=mesh.parts[i],record={color:p.color,alphaMode:p.alphaMode,alphaCutoff:p.alphaCutoff,unlit:p.unlit,emissive:p.emissive};
  for(const name of ['vertices','texcoords','vertexColors'])if(p[name]){const path=join(output,asset.id+'-'+i+'-'+name+'.bin');await writeFile(path,Buffer.from(p[name].buffer,p[name].byteOffset,p[name].byteLength));record[name]=path;}
  if(p.texture){
   record.wrapS=p.texture.wrapS;record.wrapT=p.texture.wrapT;
   if(p.texture.bytes){const path=join(output,asset.id+'-'+i+'-texture');await writeFile(path,p.texture.bytes);record.texture=path;}
   else {const file=fileURLToPath(p.texture.url);if(!file.startsWith(join(root,'assets/free/')))throw Error('Texture outside bundled assets');record.texture=file;}
  }
  parts.push(record);
 }
 const job={id:asset.id,target:join(root,asset.thumbnailUrl),parts};const path=join(output,asset.id+'.json');await writeFile(path,JSON.stringify(job));jobs.push(path);
}
await writeFile(join(output,'jobs.json'),JSON.stringify(jobs));console.log(jobs.length+' local nature preview jobs');
