// WarLike Library -> Engine: explicit file-based GLB import, checked before registration.
// Nothing is executed from the transferred JSON. Assets are persisted in IndexedDB.
const DB='warlike-engine-library-assets',STORE='models',LIMIT=25*1024*1024;
const plain=(v)=>v&&typeof v==='object'&&!Array.isArray(v);
function validVector(v,min=-1e5,max=1e5){return Array.isArray(v)&&v.length===3&&v.every(n=>typeof n==='number'&&Number.isFinite(n)&&n>=min&&n<=max)}
function decodeBase64(s){if(typeof s!=='string'||s.length>LIMIT*1.38)throw Error('Binaire manquant ou trop grand.');let raw;try{raw=atob(s)}catch{throw Error('Base64 du pack invalide.')}const bytes=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);return bytes}
export async function parseLibraryTransfer(pack){
 if(!plain(pack)||pack.schema!=='warlike.library.transfer.v1'||pack.version!==1||!plain(pack.asset)||!plain(pack.prefab)||!plain(pack.binary))throw Error('Pack WarLike Library non reconnu.');
 const {asset,prefab,binary}=pack;
 const isImage=prefab.mode==='2d'&&asset.kind==='image'&&typeof asset.filename==='string'&&/^[a-z0-9_.-]+\.png$/i.test(asset.filename);
 const isModel=prefab.mode==='3d'&&asset.kind==='model'&&typeof asset.filename==='string'&&/^[a-z0-9_.-]+\.glb$/i.test(asset.filename);
 if(prefab.schema!=='warlike.prefab.v1'||prefab.assetId!==asset.id||(!isImage&&!isModel)||typeof prefab.name!=='string'||!prefab.name.trim()||prefab.name.length>160)throw Error('Prefab et asset incompatibles.');
 if(binary.encoding!=='base64'||!Number.isSafeInteger(binary.byteLength)||binary.byteLength<20||binary.byteLength>LIMIT||! /^[a-f0-9]{64}$/i.test(binary.sha256))throw Error('Métadonnées du binaire invalides.');
 const bytes=decodeBase64(binary.data);
 if(bytes.length!==binary.byteLength)throw Error('Taille du GLB incorrecte.');
 const digest=new Uint8Array(await crypto.subtle.digest('SHA-256',bytes));const sha=Array.from(digest,b=>b.toString(16).padStart(2,'0')).join('');
 if(sha!==binary.sha256.toLowerCase())throw Error('Empreinte SHA-256 incorrecte.');
 const view=new DataView(bytes.buffer);
 if(isImage){
  if(bytes.length>256*1024||bytes.length<24||view.getUint32(0,false)!==0x89504e47||view.getUint32(4,false)!==0x0d0a1a0a||view.getUint32(12,false)!==0x49484452)throw Error('Sprite PNG invalide ou trop volumineux (256 Ko maximum).');
  const width=view.getUint32(16,false),height=view.getUint32(20,false);
  if(!width||!height||width>4096||height>4096)throw Error('Dimensions PNG invalides.');
  const cfg=plain(prefab.components)?prefab.components:{};
  const transform=plain(cfg.transform)?cfg.transform:{};
  const safe={assetId:asset.id,mode:'2d',name:prefab.name,filename:asset.filename,license:typeof asset.license==='string'?asset.license.slice(0,100):'Licence inconnue',sourceUrl:typeof asset.sourceUrl==='string'&&/^https:\/\//.test(asset.sourceUrl)?asset.sourceUrl:null,sourcePrefabId:typeof prefab.id==='string'?prefab.id.slice(0,160):'',parentId:typeof prefab.parentId==='string'?prefab.parentId.slice(0,160):null,config:{transform:{position:validVector(transform.position)?transform.position:[0,0,0],rotation:validVector(transform.rotation)?transform.rotation:[0,0,0],scale:validVector(transform.scale,.001,1000)?transform.scale:[1,1,1]},collider:plain(cfg.collider)?{enabled:cfg.collider.enabled===true}:null,scripts:plain(cfg.scripts)?{enabled:cfg.scripts.enabled===true,entries:Array.isArray(cfg.scripts.entries)?cfg.scripts.entries.filter(x=>typeof x==='string'&&x.length<=160).slice(0,16):[]}:null},width,height,spriteData:'data:image/png;base64,'+binary.data};
  return {id:'library-'+sha.slice(0,24),sha256:sha,blob:new Blob([bytes],{type:'image/png'}),metadata:safe,meshCount:0,materialCount:0,animationCount:0,textureCount:1};
 }
 if(view.getUint32(0,true)!==0x46546c67||view.getUint32(4,true)!==2||view.getUint32(8,true)!==bytes.length||view.getUint32(16,true)!==0x4e4f534a||view.getUint32(12,true)>bytes.length-20)throw Error('Fichier GLB 2.0 invalide.');
 let model;try{model=JSON.parse(new TextDecoder().decode(bytes.subarray(20,20+view.getUint32(12,true))))}catch{throw Error('JSON interne du GLB invalide.')}
 if(model.asset?.version!=='2.0'||!Array.isArray(model.meshes)||model.meshes.length===0)throw Error('Le modèle ne contient aucun maillage.');
 // GLB bytes must be self-contained; remote references would break offline projects/exports.
 const external=[...(Array.isArray(model.buffers)?model.buffers:[]),...(Array.isArray(model.images)?model.images:[])].filter(item=>typeof item?.uri==='string'&&!item.uri.startsWith('data:'));
 if(external.length)throw Error('GLB avec dépendances externes : incorpore les images et buffers avant l’installation.');
 const materialCount=Array.isArray(model.materials)?model.materials.length:0;
 const animationCount=Array.isArray(model.animations)?model.animations.length:0;
 const textureCount=Array.isArray(model.textures)?model.textures.length:0;
 const cfg=plain(prefab.components)?prefab.components:{};
 const transform=plain(cfg.transform)?cfg.transform:{};
 for(const k of ['position','rotation'])if(transform[k]!=null&&!validVector(transform[k]))throw Error('Transform '+k+' invalide.');
 if(transform.scale!=null&&!validVector(transform.scale,.001,1000))throw Error('Échelle de prefab invalide.');
 const scale=transform.scale||[1,1,1];
 const collider=plain(cfg.collider)?cfg.collider:null,renderer=plain(cfg.renderer)?cfg.renderer:null;
 const safe={assetId:asset.id,mode:'3d',name:prefab.name,filename:asset.filename,license:typeof asset.license==='string'?asset.license.slice(0,100):'Licence inconnue',sourceUrl:typeof asset.sourceUrl==='string'&&/^https:\/\//.test(asset.sourceUrl)?asset.sourceUrl:null,sourcePrefabId:typeof prefab.id==='string'?prefab.id.slice(0,160):'',parentId:typeof prefab.parentId==='string'?prefab.parentId.slice(0,160):null,config:{transform:{position:transform.position||[0,0,0],rotation:transform.rotation||[0,0,0],scale},renderer:renderer?{visible:renderer.visible!==false,castShadow:renderer.castShadow===true}:null,collider:collider?{enabled:collider.enabled===true,shape:['box','capsule','sphere'].includes(collider.shape)?collider.shape:'box',isTrigger:collider.isTrigger===true}:null,animator:plain(cfg.animator)?{enabled:cfg.animator.enabled===true,defaultClip:String(cfg.animator.defaultClip||'').slice(0,160)}:null,rigidbody:plain(cfg.rigidbody)?{enabled:cfg.rigidbody.enabled===true,mass:Number.isFinite(cfg.rigidbody.mass)?cfg.rigidbody.mass:1,useGravity:cfg.rigidbody.useGravity!==false}:null,scripts:plain(cfg.scripts)&&cfg.scripts.enabled===true?{enabled:true,entries:Array.isArray(cfg.scripts.entries)?cfg.scripts.entries.filter(x=>typeof x==='string'&&x.length<=160&&/^[\\w./-]+\\.(wls|js|ts|cs)$/.test(x)&&!x.includes('..')).slice(0,16):[]}:null,vehicle:plain(cfg.vehicle)&&cfg.vehicle.enabled===true?{enabled:true,drive:['wheels','tracks','static'].includes(cfg.vehicle.drive)?cfg.vehicle.drive:'wheels',steeringAngle:Number.isFinite(cfg.vehicle.steeringAngle)?Math.max(0,Math.min(90,cfg.vehicle.steeringAngle)):30,maxSpeed:Number.isFinite(cfg.vehicle.maxSpeed)?Math.max(0,Math.min(150,cfg.vehicle.maxSpeed)):22,parts:plain(cfg.vehicle.parts)?Object.fromEntries(Object.entries(cfg.vehicle.parts).filter(([key,value])=>['wheelFL','wheelFR','wheelRL','wheelRR','doorL','doorR','turret','barrel'].includes(key)&&typeof value==='string'&&value.length<=160)):{} }:null}};
 return {id:'library-'+sha.slice(0,24),sha256:sha,blob:new Blob([bytes],{type:'model/gltf-binary'}),metadata:safe,meshCount:model.meshes.length,materialCount,animationCount,textureCount};
}
export function nativePrefabFromTransfer(record){
 const c=record.metadata.config,scale=c.transform.scale;
 if(record.metadata.mode==='2d'){
  const sourceId=record.metadata.sourcePrefabId.replace(/[^a-zA-Z0-9_-]/g,'').slice(0,100);
  return {id:'library-prefab-'+record.id.slice(8)+'-'+sourceId,name:record.metadata.name,mode:'2d',components:{type:'object',assetId:record.id,w:Math.max(1,Math.round(record.metadata.width*scale[0])),h:Math.max(1,Math.round(record.metadata.height*scale[1])),spriteUrl:record.metadata.spriteData,sourceType:'png',collidable:c.collider?.enabled===true,rotation:c.transform.rotation[2]||0,visible:true,libraryConfig:c},origin:{store:'WarLike Library',license:record.metadata.license,sourceUrl:record.metadata.sourceUrl,sourcePrefabId:record.metadata.sourcePrefabId,parentId:record.metadata.parentId,sha256:record.sha256}};
 }
 const w=Math.max(1,Math.round(80*scale[0])),h=Math.max(1,Math.round(80*scale[1])),depth=Math.max(1,Math.round(80*scale[2]));
 const sourceId=record.metadata.sourcePrefabId.replace(/[^a-zA-Z0-9_-]/g,'').slice(0,100);
 return {id:'library-prefab-'+record.id.slice(8)+'-'+sourceId,name:record.metadata.name,mode:'3d',components:{type:'mesh3d',meshShape:'glb',assetId:record.id,model3dId:record.id,w,h,depth3d:depth,collision3d:c.collider?.enabled===true,vehicleConfig:c.vehicle?.enabled?{...c.vehicle,driveable:c.vehicle.drive!=='static'}:undefined,rigidbody3d:c.vehicle?.enabled?{enabled:true,kinematic:true,mass:c.rigidbody?.mass||1200}:undefined,visible:c.renderer?.visible!==false,color:'#ffffff',rotation:c.transform.rotation[1]||0,elevation3d:c.transform.position[1]||0,libraryConfig:c},origin:{store:'WarLike Library',license:record.metadata.license,sourceUrl:record.metadata.sourceUrl,sourcePrefabId:record.metadata.sourcePrefabId,parentId:record.metadata.parentId,sha256:record.sha256}};
}
function openDatabase(){return new Promise((resolve,reject)=>{const request=indexedDB.open(DB,2);request.onupgradeneeded=()=>{for(const name of [STORE,'scripts'])if(!request.result.objectStoreNames.contains(name))request.result.createObjectStore(name,{keyPath:'id'})};request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error||Error('IndexedDB inaccessible'));request.onblocked=()=>reject(Error('Ferme les autres onglets Engine.'))})}
export async function storeLibraryModel(record){
 const db=await openDatabase();
 try{await new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put({id:record.id,sha256:record.sha256,blob:record.blob,metadata:record.metadata});tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error)})}
 finally{db.close()}
}
export async function readLibraryModels(){
 const db=await openDatabase();try{return await new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readonly'),r=tx.objectStore(STORE).getAll();r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}finally{db.close()}
}
export function planLibraryPrefabInstall(record,storage=globalThis.localStorage){
 const key='warlike.prefabs.library.v1',prefab=nativePrefabFromTransfer(record);
 const list=JSON.parse(storage.getItem(key)||'[]');
 if(!Array.isArray(list)||list.length>2000)throw Error('Bibliothèque de prefabs pleine ou invalide.');
 const same=list.find(p=>p?.id===prefab.id);
 if(same)return {status:'unchanged',prefab:same};
 const conflict=list.find(p=>p?.origin?.sourcePrefabId&&p.origin.sourcePrefabId===prefab.origin.sourcePrefabId&&p.origin.sha256!==prefab.origin.sha256);
 return {status:conflict?'conflict':'new',prefab,conflict:conflict||null};
}
export function installLibraryPrefab(record,storage=globalThis.localStorage,{replace=false}={}){
 const key='warlike.prefabs.library.v1',plan=planLibraryPrefabInstall(record,storage);
 if(plan.status==='unchanged')return {prefab:plan.prefab,installed:false,updated:false};
 if(plan.status==='conflict'&&!replace)throw Error('Conflit de version : prefab déjà installé avec un autre modèle. Confirmation requise.');
 const list=JSON.parse(storage.getItem(key)||'[]');
 if(plan.status==='conflict'){
  const index=list.findIndex(p=>p?.id===plan.conflict.id);
  if(index<0)throw Error('Conflit modifié : recommence l’installation.');
  list.splice(index,1);
 }
 list.push(plan.prefab);
 storage.setItem(key,JSON.stringify(list));
 return {prefab:plan.prefab,installed:true,updated:plan.status==='conflict'};
}
export async function hydrateLibraryModels(registerModel){
 if(typeof indexedDB==='undefined')return {loaded:0,errors:['IndexedDB indisponible']};
 let records;try{records=await readLibraryModels()}catch(e){return {loaded:0,errors:[String(e.message||e)]}}
 const errors=[];let loaded=0;
 for(const record of records){try{if(record.metadata?.mode==='2d')continue;if(!/^library-[a-f0-9]{24}$/.test(record.id)||!record.blob||record.blob.size>LIMIT)throw Error('Modèle invalide');const file=new File([record.blob],record.metadata.filename,{type:'model/gltf-binary'});const registered=registerModel(file,{id:record.id,license:record.metadata.license});if(record.metadata.config?.vehicle?.enabled)registered.category='Vehicles';loaded++}catch(e){errors.push(record.id+': '+e.message)}}
 return {loaded,errors};
}
