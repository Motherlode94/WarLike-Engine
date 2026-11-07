// WarLike native prefab templates generated only from bundled, licensed GLB records.
// A prefab references an existing model3dId; it does not create or copy a 3D mesh.
export const PREFAB_STORAGE_KEY='warlike.prefabs.library.v1';
const KEY_PREFIX='store-prefab-';
const categories=new Set(['Personnages','Véhicules','Armes','Bâtiments','Nature','Objets']);
function valid(a){return a&&typeof a.id==='string'&&/^[\w.-]{1,150}$/.test(a.id)&&typeof a.name==='string'&&a.name.length>0&&categories.has(a.category)&&a.bundled===true&&typeof a.url==='string'}
export function prefabFromBundledAsset(asset){
 if(!valid(asset))throw Error('Un modèle 3D gratuit du catalogue WarLike est requis');
 const solid=!['Nature'].includes(asset.category);
 const components={type:'mesh3d',assetId:asset.id,model3dId:asset.id,meshShape:'glb',w:80,h:80,depth3d:80,elevation3d:0,rotation:0,color:'#ffffff',collision3d:solid,visible:true};
 // No invented movement, AI, weapon damage, vehicle physics or animation controller.
 return {id:KEY_PREFIX+asset.id,name:asset.name,mode:'3d',components,origin:{store:'WarLike Asset Store',author:asset.author||'Auteur inconnu',license:asset.license||'Licence non précisée',sourceUrl:asset.source||'',model3dId:asset.id}};
}
export function installBundledPrefab(asset,storage=globalThis.localStorage){
 const prefab=prefabFromBundledAsset(asset);
 let list;try{list=JSON.parse(storage.getItem(PREFAB_STORAGE_KEY)||'[]')}catch{list=[]}
 if(!Array.isArray(list))throw Error('Bibliothèque des prefabs invalide');
 // Prevent accidental overwrite of user-edited templates with the same id.
 const existing=list.find(p=>p?.id===prefab.id);
 if(existing)return {prefab:existing,installed:false};
 if(list.length>=2000)throw Error('Bibliothèque pleine (2 000 prefabs).');
 list.push(prefab);
 storage.setItem(PREFAB_STORAGE_KEY,JSON.stringify(list));
 if(typeof document!=='undefined')document.dispatchEvent(new Event('warlike:prefabs'));
 return {prefab,installed:true};
}
export function installedPrefabIds(storage=globalThis.localStorage){
 try{const items=JSON.parse(storage.getItem(PREFAB_STORAGE_KEY)||'[]');return new Set(Array.isArray(items)?items.filter(x=>x?.id?.startsWith(KEY_PREFIX)).map(x=>x.id.slice(KEY_PREFIX.length)):[])}catch{return new Set()}
}
