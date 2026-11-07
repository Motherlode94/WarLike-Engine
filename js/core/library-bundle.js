// Atomic multi-asset import contract shared with WarLike Library Bundle Builder.
// Binary resources are verified before any persistent write. Script sources
// are archived only; importing never executes external code.
import {parseLibraryTransfer,nativePrefabFromTransfer} from './library-transfer.js';
const DB='warlike-engine-library-assets',PREFABS='warlike.prefabs.library.v1';
const SIZE_LIMIT=32*1024*1024;
const validId=id=>typeof id==='string'&&id.length>0&&id.length<=160&&/^[a-zA-Z0-9_.-]+$/.test(id);
const decode=string=>{if(typeof string!=='string'||string.length>500000)throw Error('Script trop volumineux.');let raw;try{raw=atob(string);}catch{throw Error('Script Base64 invalide.');}return Uint8Array.from(raw,c=>c.charCodeAt(0));};
const hash=async bytes=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),x=>x.toString(16).padStart(2,'0')).join('');
export async function parseLibraryBundle(data){
 if(data?.schema!=='warlike.library.bundle.v2'||data.version!==2||!Array.isArray(data.items)||!Array.isArray(data.scripts)||data.items.length+data.scripts.length<1||data.items.length+data.scripts.length>16)throw Error('Bundle WarLike v2 invalide (16 ressources maximum).');
 const models=[],scripts=[],ids=new Set(),prefabIds=new Set();
 let total=0;
 for(const item of data.items){
  const model=await parseLibraryTransfer(item);
  total+=model.blob.size;
  if(!validId(model.metadata.assetId)||ids.has(model.metadata.assetId)||prefabIds.has(model.metadata.sourcePrefabId))throw Error('Identifiants de ressources ou de prefabs répétés.');
  ids.add(model.metadata.assetId);prefabIds.add(model.metadata.sourcePrefabId);
  models.push(model);
 }
 for(const item of data.scripts){
  if(!validId(item?.id)||ids.has(item.id)||typeof item.filename!=='string'||!/^[\w.-]+\.(wls|js|ts|cs)$/i.test(item.filename)||!item.binary||item.binary.encoding!=='base64'||!/^[0-9a-f]{64}$/i.test(item.binary.sha256))throw Error('Entrée script invalide.');
  const bytes=decode(item.binary.data);
  if(bytes.length!==item.binary.byteLength||bytes.length>256*1024||bytes.length<1||await hash(bytes)!==item.binary.sha256.toLowerCase())throw Error('Script modifié ou trop volumineux.');
  const text=new TextDecoder('utf-8',{fatal:true}).decode(bytes);
  if(text.includes('\0'))throw Error('Script contenant des octets interdits.');
  total+=bytes.length;ids.add(item.id);
  scripts.push({id:item.id,filename:item.filename,sha256:item.binary.sha256.toLowerCase(),text,license:typeof item.license==='string'?item.license.slice(0,100):'Non précisée'});
 }
 if(total>SIZE_LIMIT)throw Error('Bundle supérieur à 32 Mo.');
 return {models,scripts,total};
}
export function planBundlePrefabs(bundle,storage=globalThis.localStorage){
 const existing=JSON.parse(storage.getItem(PREFABS)||'[]');
 if(!Array.isArray(existing)||existing.length>2000)throw Error('Bibliothèque de prefabs corrompue ou pleine.');
 const newPrefabs=bundle.models.map(nativePrefabFromTransfer),conflicts=[];
 for(const prefab of newPrefabs){
  const prior=existing.find(p=>p.id===prefab.id||p.origin?.sourcePrefabId&&p.origin.sourcePrefabId===prefab.origin.sourcePrefabId);
  if(prior&&prior.origin?.sha256!==prefab.origin.sha256)conflicts.push({old:prior,new:prefab});
 }
 if(existing.length+newPrefabs.length-conflicts.length>2000)throw Error('Bibliothèque de prefabs pleine.');
 return {conflicts,newPrefabs,existing};
}
function database(){return new Promise((resolve,reject)=>{
 const request=indexedDB.open(DB,2);
 request.onupgradeneeded=()=>{for(const name of ['models','scripts'])if(!request.result.objectStoreNames.contains(name))request.result.createObjectStore(name,{keyPath:'id'});};
 request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error||Error('IndexedDB inaccessible'));request.onblocked=()=>reject(Error('Autres fenêtres Engine bloquent le stockage'));
});}
export async function installLibraryBundle(bundle,{replace=false,storage=globalThis.localStorage}={}){
 const plan=planBundlePrefabs(bundle,storage);
 if(plan.conflicts.length&&!replace)throw Error('Conflit de versions : confirmation requise pour '+plan.conflicts.length+' prefab(s).');
 const db=await database();
 try{
  await new Promise((resolve,reject)=>{
   const tx=db.transaction(['models','scripts'],'readwrite'),models=tx.objectStore('models'),scripts=tx.objectStore('scripts');
   for(const model of bundle.models)models.put({id:model.id,sha256:model.sha256,blob:model.blob,metadata:model.metadata});
   for(const script of bundle.scripts)scripts.put(script);
   tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error||Error('Installation impossible'));tx.onabort=()=>reject(tx.error||Error('Installation annulée'));
  });
 }finally{db.close();}
 const sourceIds=new Set(plan.newPrefabs.map(p=>p.origin.sourcePrefabId));
 const merged=plan.existing.filter(p=>!plan.newPrefabs.some(n=>n.id===p.id)&&!(replace&&sourceIds.has(p.origin?.sourcePrefabId)));
 for(const prefab of plan.newPrefabs)merged.push(prefab);
 storage.setItem(PREFABS,JSON.stringify(merged));
 if(typeof document!=='undefined')document.dispatchEvent(new Event('warlike:prefabs'));
 return {models:bundle.models.length,scripts:bundle.scripts.length,replaced:plan.conflicts.length};
}
export async function readInstalledLibraryScripts(){
 const db=await database();try{return await new Promise((resolve,reject)=>{const tx=db.transaction('scripts','readonly'),r=tx.objectStore('scripts').getAll();r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}finally{db.close();}
}
