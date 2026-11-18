// Project-scoped binary HDRI storage shared by Editor, scene JSON and Web export.
// IndexedDB avoids localStorage quota corruption for multi-megabyte panoramas.
import {decodeRadianceHdr} from './hdr-radiance-3d.js';
const DB='warlike-hdri-assets-v1',STORE='environments',LIMIT=64*1024*1024;
const validId=id=>typeof id==='string'&&id.length>0&&id.length<160&&!/[/\\]/.test(id);
const open=()=>new Promise((resolve,reject)=>{
 if(typeof indexedDB==='undefined')return reject(Error('IndexedDB non disponible'));
 const req=indexedDB.open(DB,1);
 req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains(STORE))req.result.createObjectStore(STORE,{keyPath:'id'})};
 req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
});
const change=async(mode,act)=>{
 const db=await open();
 try{return await new Promise((resolve,reject)=>{
  const tx=db.transaction(STORE,mode),req=act(tx.objectStore(STORE));let value;
  req.onsuccess=()=>{value=req.result};req.onerror=()=>reject(req.error);
  tx.oncomplete=()=>resolve(value);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);
 })}finally{db.close()}
};
export const validHdriBytes=bytes=>bytes instanceof Uint8Array&&bytes.length>=32&&bytes.length<=LIMIT;
export async function storeProjectHdri(id,name,input){
 if(!validId(id))throw Error('Identifiant de projet HDRI invalide');
 const bytes=input instanceof Uint8Array?input:new Uint8Array(input);
 if(!validHdriBytes(bytes))throw Error('HDRI vide ou trop volumineux');
 // Reject invalid Radiance payloads before they become persistent project state.
 decodeRadianceHdr(bytes);
 await change('readwrite',store=>store.put({id,name:String(name||'environment.hdr').slice(0,120),bytes}));
 return bytes.length;
}
export async function loadProjectHdri(id){
 if(!validId(id)||typeof indexedDB==='undefined')return null;
 const entry=await change('readonly',store=>store.get(id));
 return entry&&validHdriBytes(entry.bytes)?entry:null;
}
export async function deleteProjectHdri(id){
 if(!validId(id))return;
 await change('readwrite',store=>store.delete(id));
}
export function packPortableHdri(name,bytes){
 if(!validHdriBytes(bytes))throw Error('HDRI binaire non valide');
 const chunks=[];for(let i=0;i<bytes.length;i+=16384)chunks.push(String.fromCharCode(...bytes.subarray(i,i+16384)));
 return {encoding:'base64',name:String(name||'environment.hdr').slice(0,120),data:btoa(chunks.join(''))};
}
export function unpackPortableHdri(asset){
 if(!asset||asset.encoding!=='base64'||typeof asset.data!=='string'||asset.data.length>Math.ceil(LIMIT/3)*4+8)throw Error('HDRI portable invalide');
 const bytes=Uint8Array.from(atob(asset.data),c=>c.charCodeAt(0));
 if(!validHdriBytes(bytes))throw Error('HDRI portable hors limites');
 return {name:asset.name||'environment.hdr',bytes};
}
export async function encodeProjectHdri(id){
 const entry=await loadProjectHdri(id);
 return entry?packPortableHdri(entry.name,entry.bytes):null;
}
export async function restoreProjectHdri(id,packed){
 if(packed===null){await deleteProjectHdri(id);return null}
 const asset=unpackPortableHdri(packed);
 await storeProjectHdri(id,asset.name,asset.bytes);
 return asset;
}
