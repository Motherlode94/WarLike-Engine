import {readFile,writeFile} from 'node:fs/promises';
import {parseGlb} from '../../js/assets/real-models-3d.js';
const root=new URL('../../',import.meta.url);
const fields=['id','name','category','shape','url','license','author','collection','pack','packName','sourceUrl','normalizedSize','triangles','thumbnailUrl','animationClips','textureFiles'];
for(const author of ['kenney','quaternius']){
 const manifest=new URL('assets/free/'+author+'/models.json',root),models=JSON.parse(await readFile(manifest,'utf8'));const errors=[];
 for(const asset of models){
  try{
   const bytes=await readFile(new URL(asset.url,root));const geometry=parseGlb(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.length),{baseUrl:new URL(asset.url,root).href});
   asset.normalizedSize=geometry.normalizedSize;asset.triangles=geometry.triangleCount;
   asset.thumbnailUrl||=asset.url.slice(0,asset.url.lastIndexOf('/')+1)+'previews/'+asset.id+'.png';
   if(!geometry.parts.every(p=>p.vertices.every(Number.isFinite)))throw Error('Non-finite mesh coordinates');
  }catch(error){errors.push({id:asset.id,error:error.message})}
 }
 if(errors.length){console.error(errors);throw Error(errors.length+' invalid models')}
 await writeFile(manifest,JSON.stringify(models,null,2)+'\n');
 const declaration='export const '+(author==='kenney'?'freeModels3d':'quaterniusModels3d')+'=[\n'+models.map(a=>' '+JSON.stringify(Object.fromEntries(fields.filter(k=>a[k]!==undefined).map(k=>[k,a[k]])))).join(',\n')+'\n];\n';
 const module=new URL('js/assets/'+(author==='kenney'?'free-game-assets.js':'quaternius-game-assets.js'),root);
 if(author==='kenney'){const current=await readFile(module,'utf8');await writeFile(module,'// Complete bundled CC0 models. Exact sources and hashes are in assets/free/kenney/models.json.\n'+declaration+current.slice(current.indexOf('export const freeSprites2d=')))}
 else await writeFile(module,'// Complete bundled CC0 models, with original geometry and clips.\n'+declaration);
 console.log(author,models.length,'models',new Set(models.map(a=>a.pack)).size,'packs');
}
