// User-defined scene prefabs. Explicit overrides stay on instances until applied.
const key='warlike.prefabs.library.v1';
const clean=o=>{const {id,name,x,y,...components}=o;return structuredClone(components)};
export function readPrefabs(storage=globalThis.localStorage){
 try{const data=JSON.parse(storage.getItem(key)||'[]');return Array.isArray(data)?data.filter(p=>p&&typeof p.id==='string'&&p.components&&typeof p.components==='object'):[]}
 catch{return []}
}
export const prefabMode=prefab=>['2d','3d'].includes(prefab?.mode)?prefab.mode:prefab?.components?.type==='mesh3d'||prefab?.components?.collider3d||prefab?.components?.controller3d||prefab?.components?.rigidbody3d?'3d':'2d';
export const prefabsForMode=(prefabs,mode)=>prefabs.filter(p=>prefabMode(p)===mode);
const changed=()=>globalThis.document?.dispatchEvent?.(new Event('warlike:prefabs'));
export function savePrefab(entity,storage=globalThis.localStorage,{mode=null}={}){
 if(!entity||typeof entity!=='object')throw Error('Sélectionne un objet valide');
 const entries=readPrefabs(storage),id='prefab-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7);
 const prefab={id,name:entity.name||'Prefab',components:clean(entity)};prefab.mode=['2d','3d'].includes(mode)?mode:prefabMode(prefab);
 entries.push(prefab);storage.setItem(key,JSON.stringify(entries));changed();return prefab;
}
export function instantiatePrefab(prefab,nextId,x=120,y=120){
 if(!prefab?.components)throw Error('Prefab invalide');
 return {...structuredClone(prefab.components),id:nextId,name:prefab.name+' '+nextId,x,y,prefabSourceId:prefab.id,prefabOverrides:[]};
}
export function applyPrefabChanges(prefab,entity,instances){
 if(!prefab||!entity||entity.prefabSourceId!==prefab.id)throw Error('Instance incompatible');
 const next={...prefab,components:clean(entity)};
 const affected=instances.map(item=>{
  if(item.prefabSourceId!==prefab.id||item.id===entity.id)return item;
  const preserved=new Set(['id','name','x','y','prefabSourceId','prefabOverrides',...(item.prefabOverrides||[])]);
  const copy={...item};for(const [property,value] of Object.entries(next.components))if(!preserved.has(property))copy[property]=structuredClone(value);
  return copy;
 });
 return {prefab:next,instances:affected};
}
export function updatePrefab(prefab,storage=globalThis.localStorage){
 const list=readPrefabs(storage),index=list.findIndex(p=>p.id===prefab.id);
 if(index<0)throw Error('Prefab absent');
 list[index]=prefab;storage.setItem(key,JSON.stringify(list));changed();
}
