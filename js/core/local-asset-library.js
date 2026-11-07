import {packageGlb,imageResource} from '../assets/glb-package.js';
// Durable local GLB library: IndexedDB stores model files, never raw filesystem paths.
import {importedModels3d,parseGlb} from '../assets/real-models-3d.js';
const DB='warlike-local-assets-v1',STORE='glb';
const open=()=>new Promise((resolve,reject)=>{
 if(typeof indexedDB==='undefined'){reject(Error('IndexedDB indisponible'));return}
 const request=indexedDB.open(DB,1);
 request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains(STORE))request.result.createObjectStore(STORE,{keyPath:'id'})};
 request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);
});
const transaction=(db,mode,action)=>new Promise((resolve,reject)=>{
 const tx=db.transaction(STORE,mode),store=tx.objectStore(STORE);
 const req=action(store);let result;req.onsuccess=()=>{result=req.result};req.onerror=()=>reject(req.error);tx.oncomplete=()=>resolve(result);tx.onerror=()=>reject(tx.error||Error('Transaction IndexedDB échouée'));tx.onabort=()=>reject(tx.error||Error('Transaction IndexedDB annulée'));
});
export async function persistLocalModel(asset,{resolve}={}){
 if(!asset?.file||!asset.id)throw Error('Modèle GLB local invalide');
 const buffer=await packageGlb(await asset.file.arrayBuffer(),async uri=>{if(/^data:image\/(png|jpeg|webp);base64,/i.test(uri))return imageResource(await fetch(uri));if(resolve)return resolve(uri);throw Error('Texture externe manquante : '+uri+'. Importe le dossier complet.');});
 parseGlb(buffer);asset.file=new File([buffer],asset.file.name,{type:'model/gltf-binary'});
 const db=await open();
 try{await transaction(db,'readwrite',store=>store.put({id:asset.id,name:asset.name,category:asset.category,sourcePath:asset.sourcePath||'',sourceUrl:asset.sourceUrl||'',file:asset.file,license:asset.license}))}
 finally{db.close()}
 return asset.id;
}
export async function restoreLocalModels(){
 const db=await open();let entries;
 try{entries=await transaction(db,'readonly',store=>store.getAll())}finally{db.close()}
 let restored=0;
 for(const entry of entries){
  if(!entry.id||!entry.file||!/\.glb$/i.test(entry.file.name))continue;
  importedModels3d.set(entry.id,{id:entry.id,name:entry.name,category:entry.category||'Imported 3D',sourcePath:entry.sourcePath||'',sourceUrl:entry.sourceUrl||'',shape:'glb',file:entry.file,license:entry.license||'Fichier local'});
  restored++;
 }
 return restored;
}
export async function clearLocalModels(){
 const db=await open();
 try{await transaction(db,'readwrite',store=>store.clear())}finally{db.close()}
 for(const [id,asset] of importedModels3d)if(asset.file&&id.startsWith('local-'))importedModels3d.delete(id);
}
