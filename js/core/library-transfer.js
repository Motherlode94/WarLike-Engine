// WarLike Library -> Engine: explicit file-based GLB import, checked before registration.
// Nothing is executed from the transferred JSON. Assets are persisted in IndexedDB.
const DB='warlike-engine-library-assets',STORE='models',LIMIT=25*1024*1024;
const plain=(v)=>v&&typeof v==='object'&&!Array.isArray(v);
function validVector(v,min=-1e5,max=1e5){return Array.isArray(v)&&v.length===3&&v.every(n=>typeof n==='number'&&Number.isFinite(n)&&n>=min&&n<=max)}
function decodeBase64(s){if(typeof s!=='string'||s.length>LIMIT*1.38)throw Error('Binaire manquant ou trop grand.');let raw;try{raw=atob(s)}catch{throw Error('Base64 du pack invalide.')}const bytes=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);return bytes}
export async function parseLibraryTransfer(pack){
 if(!plain(pack)||pack.schema!=='warlike.library.transfer.v1'||pack.version!==1||!plain(pack.asset)||!plain(pack.prefab)||!plain(pack.binary))throw Error('Pack WarLike Library non reconnu.');
 const {asset,prefab,binary}=pack;
 if(prefab.schema!=='warlike.prefab.v1'||prefab.mode!=='3d'||prefab.assetId!==asset.id||asset.kind!=='model'||typeof asset.filename!=='string'||!/^[a-z0-9_.-]+\.glb$/i.test(asset.filename)||typeof prefab.name!=='string'||!prefab.name.trim()||prefab.name.length>160)throw Error('Prefab et modèle incompatibles.');
 if(binary.encoding!=='base64'||!Number.isSafeInteger(binary.byteLength)||binary.byteLength<20||binary.byteLength>LIMIT||! /^[a-f0-9]{64}$/i.test(binary.sha256))throw Error('Métadonnées du binaire invalides.');
 const bytes=decodeBase64(binary.data);
 if(bytes.length!==binary.byteLength)throw Error('Taille du GLB incorrecte.');
 const digest=new Uint8Array(await crypto.subtle.digest('SHA-256',bytes));const sha=Array.from(digest,b=>b.toString(16).padStart(2,'0')).join('');
 if(sha!==binary.sha256.toLowerCase())throw Error('Empreinte SHA-256 incorrecte.');
 const view=new DataView(bytes.buffer);if(view.getUint32(0,true)!==0x46546c67||view.getUint32(4,true)!==2||view.getUint32(8,true)!==bytes.length||view.getUint32(16,true)!==0x4e4f534a||view.getUint32(12,true)>bytes.length-20)throw Error('Fichier GLB 2.0 invalide.');
 let model;try{model=JSON.parse(new TextDecoder().decode(bytes.subarray(20,20+view.getUint32(12,true))))}catch{throw Error('JSON interne du GLB invalide.')}
 if(model.asset?.version!=='2.0'||!Array.isArray(model.meshes)||model.meshes.length===0)throw Error('Le modèle ne contient aucun maillage.');
 const cfg=plain(prefab.components)?prefab.components:{};
 const transform=plain(cfg.transform)?cfg.transform:{};
 for(const k of ['position','rotation'])if(transform[k]!=null&&!validVector(transform[k]))throw Error('Transform '+k+' invalide.');
 if(transform.scale!=null&&!validVector(transform.scale,.001,1000))throw Error('Échelle de prefab invalide.');
 const scale=transform.scale||[1,1,1];
 const collider=plain(cfg.collider)?cfg.collider:null,renderer=plain(cfg.renderer)?cfg.renderer:null;
 const safe={assetId:asset.id,mode:'3d',name:prefab.name,filename:asset.filename,license:typeof asset.license==='string'?asset.license.slice(0,100):'Licence inconnue',sourceUrl:typeof asset.sourceUrl==='string'&&/^https:\/\//.test(asset.sourceUrl)?asset.sourceUrl:null,sourcePrefabId:typeof prefab.id==='string'?prefab.id.slice(0,160):'',parentId:typeof prefab.parentId==='string'?prefab.parentId.slice(0,160):null,config:{transform:{position:transform.position||[0,0,0],rotation:transform.rotation||[0,0,0],scale},renderer:renderer?{visible:renderer.visible!==false,castShadow:renderer.castShadow===true}:null,collider:collider?{enabled:collider.enabled===true,shape:['box','capsule','sphere'].includes(collider.shape)?collider.shape:'box',isTrigger:collider.isTrigger===true}:null,animator:plain(cfg.animator)?{enabled:cfg.animator.enabled===true,defaultClip:String(cfg.animator.defaultClip||'').slice(0,160)}:null,rigidbody:plain(cfg.rigidbody)?{enabled:cfg.rigidbody.enabled===true,mass:Number.isFinite(cfg.rigidbody.mass)?cfg.rigidbody.mass:1,useGravity:cfg.rigidbody.useGravity!==false}:null,vehicle:plain(cfg.vehicle)&&cfg.vehicle.enabled===true?{enabled:true,drive:['wheels','tracks','static'].includes(cfg.vehicle.drive)?cfg.vehicle.drive:'wheels',steeringAngle:Number.isFinite(cfg.vehicle.steeringAngle)?Math.max(0,Math.min(90,cfg.vehicle.steeringAngle)):30,maxSpeed:Number.isFinite(cfg.vehicle.maxSpeed)?Math.max(0,Math.min(150,cfg.vehicle.maxSpeed)):22,parts:plain(cfg.vehicle.parts)?Object.fromEntries(Object.entries(cfg.vehicle.parts).filter(([key,value])=>['wheelFL','wheelFR','wheelRL','wheelRR','doorL','doorR','turret','barrel'].includes(key)&&typeof value==='string'&&value.length<=160)):{} }:null}};
 return {id:'library-'+sha.slice(0,24),sha256:sha,blob:new Blob([bytes],{type:'model/gltf-binary'}),metadata:safe,meshCount:model.meshes.length};
}
export function nativePrefabFromTransfer(record){
 const c=record.metadata.config,scale=c.transform.scale;
 const w=Math.max(1,Math.round(80*scale[0])),h=Math.max(1,Math.round(80*scale[1])),depth=Math.max(1,Math.round(80*scale[2]));
 const sourceId=record.metadata.sourcePrefabId.replace(/[^a-zA-Z0-9_-]/g,'').slice(0,100);
 return {id:'library-prefab-'+record.id.slice(8)+'-'+sourceId,name:record.metadata.name,mode:'3d',components:{type:'mesh3d',meshShape:'glb',assetId:record.id,model3dId:record.id,w,h,depth3d:depth,collision3d:c.collider?.enabled===true,vehicleConfig:c.vehicle?.enabled?{...c.vehicle,driveable:c.vehicle.drive!=='static'}:undefined,rigidbody3d:c.vehicle?.enabled?{enabled:true,kinematic:true,mass:c.rigidbody?.mass||1200}:undefined,visible:c.renderer?.visible!==false,color:'#ffffff',rotation:c.transform.rotation[1]||0,elevation3d:c.transform.position[1]||0,libraryConfig:c},origin:{store:'WarLike Library',license:record.metadata.license,sourceUrl:record.metadata.sourceUrl,sourcePrefabId:record.metadata.sourcePrefabId,parentId:record.metadata.parentId,sha256:record.sha256}};
}
function openDatabase(){return new Promise((resolve,reject)=>{const request=indexedDB.open(DB,1);request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains(STORE))request.result.createObjectStore(STORE,{keyPath:'id'})};request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error||Error('IndexedDB inaccessible'));request.onblocked=()=>reject(Error('Ferme les autres onglets Engine.'))})}
export async function storeLibraryModel(record){
 const db=await openDatabase();
 try{await new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put({id:record.id,sha256:record.sha256,blob:record.blob,metadata:record.metadata});tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error)})}
 finally{db.close()}
}
export async function readLibraryModels(){
 const db=await openDatabase();try{return await new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readonly'),r=tx.objectStore(STORE).getAll();r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}finally{db.close()}
}
export function installLibraryPrefab(record,storage=globalThis.localStorage){
 const key='warlike.prefabs.library.v1',prefab=nativePrefabFromTransfer(record);
 const list=JSON.parse(storage.getItem(key)||'[]');if(!Array.isArray(list)||list.length>2000)throw Error('Bibliothèque de prefabs pleine ou invalide.');
 const original=list.find(p=>p?.id===prefab.id);if(original)return {prefab:original,installed:false};
 list.push(prefab);storage.setItem(key,JSON.stringify(list));return {prefab,installed:true};
}
export async function hydrateLibraryModels(registerModel){
 if(typeof indexedDB==='undefined')return {loaded:0,errors:['IndexedDB indisponible']};
 let records;try{records=await readLibraryModels()}catch(e){return {loaded:0,errors:[String(e.message||e)]}}
 const errors=[];let loaded=0;
 for(const record of records){try{if(!/^library-[a-f0-9]{24}$/.test(record.id)||!record.blob||record.blob.size>LIMIT)throw Error('Modèle invalide');const file=new File([record.blob],record.metadata.filename,{type:'model/gltf-binary'});const registered=registerModel(file,{id:record.id,license:record.metadata.license});if(record.metadata.config?.vehicle?.enabled)registered.category='Vehicles';loaded++}catch(e){errors.push(record.id+': '+e.message)}}
 return {loaded,errors};
}
