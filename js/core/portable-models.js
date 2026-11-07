import {importedModels3d,parseGlb} from '../assets/real-models-3d.js';
import {persistLocalModel} from './local-asset-library.js';
export const importedModelId=id=>typeof id==='string'&&/^(?:local-[a-z0-9-]+|library-[a-f0-9]{24})$/.test(id);
export function referencedImportedModels(payload){
 const ids=new Set(),visit=value=>{if(typeof value==='string'){if(importedModels3d.has(value))ids.add(value);else if(importedModelId(value))throw Error('Modèle importé introuvable : '+value);}else if(Array.isArray(value))value.forEach(visit);else if(value&&typeof value==='object')for(const [key,child] of Object.entries(value))if(!['importedModels','data','source','compiledSource'].includes(key))visit(child);};visit(payload);return [...ids].map(id=>importedModels3d.get(id));
}
const metadata=asset=>({id:asset.id,name:asset.name,category:asset.category,license:asset.license,sourceUrl:asset.sourceUrl||''});
export async function portableModelArchive(payload){
 const archive=[];let total=0;
 for(const asset of referencedImportedModels(payload)){
  if(!asset.file)continue;const bytes=new Uint8Array(await asset.file.arrayBuffer());total+=bytes.length;
  if(total>100*1024*1024)throw Error('Les modèles dépassent 100 Mo pour cette archive.');parseGlb(bytes.buffer);
  let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
  archive.push({...metadata(asset),data:btoa(binary)});
 }return archive;
}
export async function restoreModelArchive(archive,{persist=true}={}){
 if(archive==null)return;if(!Array.isArray(archive)||archive.length>256)throw Error('Archive de modèles invalide.');
 let total=0;const prepared=[];const ids=new Set();
 for(const entry of archive){
  if(!entry||!importedModelId(entry.id)||ids.has(entry.id)||typeof entry.name!=='string'||entry.name.length>160||typeof entry.data!=='string'||entry.data.length>35*1024*1024)throw Error('Modèle archivé invalide.');ids.add(entry.id);
  const binary=atob(entry.data);total+=binary.length;if(total>100*1024*1024)throw Error('Archive de modèles trop volumineuse.');
  const bytes=Uint8Array.from(binary,c=>c.charCodeAt(0));parseGlb(bytes.buffer);
  const previous=importedModels3d.get(entry.id);if(previous?.file){const old=new Uint8Array(await previous.file.arrayBuffer());if(old.length!==bytes.length||old.some((v,i)=>v!==bytes[i]))throw Error('Identifiant de modèle déjà utilisé : '+entry.id);}
  prepared.push({...metadata(entry),shape:'glb',file:new File([bytes],entry.name+'.glb',{type:'model/gltf-binary'})});
 }
 for(const asset of prepared){if(persist)await persistLocalModel(asset);importedModels3d.set(asset.id,asset);}
}
export function registerBuildModels(models=[]){
 for(const entry of models){if(!importedModelId(entry.id)||entry.url!=='./assets/imported/'+entry.id+'.glb')throw Error('Ressource de jeu importée invalide.');importedModels3d.set(entry.id,{...metadata(entry),shape:'glb',url:entry.url});}
}
