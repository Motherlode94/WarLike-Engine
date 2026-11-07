import {importedModels3d,model3dById,parseGlb} from '../assets/real-models-3d.js';
import {persistLocalModels} from './local-asset-library.js';
const MAX_TOTAL=100*1024*1024;
const safeId=id=>typeof id==='string'&&/^(?:local-[-a-zA-Z0-9]{1,100}|library-[a-f0-9]{24})$/.test(id);
export function referencedLocalModels(value){
 const found=new Map();
 const visit=item=>{if(typeof item==='string'){const model=model3dById(item);if(model?.file)found.set(model.id,model)}else if(Array.isArray(item))item.forEach(visit);else if(item&&typeof item==='object')Object.values(item).forEach(visit)};
 visit(value);return [...found.values()];
}
export async function portableModelBytes(asset){
 if(!safeId(asset.id))throw Error('Identifiant d’asset importé invalide.');
 const bytes=new Uint8Array(await asset.file.arrayBuffer());
 parseGlb(bytes.buffer);
 // A local GLB must carry its images and buffers to travel to another machine.
 const view=new DataView(bytes.buffer),length=view.getUint32(12,true);
 const json=JSON.parse(new TextDecoder().decode(bytes.subarray(20,20+length)));
 if((json.buffers||[]).some(b=>b.uri)||(json.images||[]).some(i=>i.uri))throw Error(asset.name+' : réexporte le GLB avec ses textures et buffers intégrés.');
 return bytes;
}
export function portableModelDescriptor(asset){
 if(!safeId(asset.id))throw Error('Identifiant d’asset importé invalide.');
 return {id:asset.id,name:asset.name,category:asset.category,shape:'glb',license:asset.license||'Fichier local',url:'./assets/imported/'+asset.id+'.glb'};
}
export async function encodeProjectAssets(payload){
 const assets=[];let total=0;
 for(const asset of referencedLocalModels(payload)){
  const bytes=await portableModelBytes(asset);total+=bytes.length;if(total>MAX_TOTAL)throw Error('Assets du projet supérieurs à 100 Mo.');
  let binary='';for(let i=0;i<bytes.length;i+=32768)binary+=String.fromCharCode(...bytes.subarray(i,i+32768));
  assets.push({...portableModelDescriptor(asset),fileName:asset.file.name,data:btoa(binary)});
 }
 return assets;
}
export async function restoreProjectAssets(entries,{persist=persistLocalModels}={}){
 if(entries===undefined)return 0;
 if(!Array.isArray(entries)||entries.length>256)throw Error('Catalogue d’assets invalide.');
 const models=[],ids=new Set();let total=0;
 for(const entry of entries){
  if(!entry||!safeId(entry.id)||ids.has(entry.id)||typeof entry.data!=='string'||entry.data.length>35*1024*1024||typeof entry.name!=='string')throw Error('Asset du projet invalide.');
  ids.add(entry.id);const binary=atob(entry.data);total+=binary.length;if(total>MAX_TOTAL)throw Error('Assets du projet supérieurs à 100 Mo.');
  const bytes=Uint8Array.from(binary,c=>c.charCodeAt(0));
  const model={...portableModelDescriptor(entry),file:new File([bytes],entry.id+'.glb',{type:'model/gltf-binary'})};
  await portableModelBytes(model);models.push(model);
 }
 // Validate every file before changing the persistent catalogue or live scene.
 if(models.length)await persist(models);
 for(const model of models)importedModels3d.set(model.id,model);
 return models.length;
}
