// User-defined scene prefabs. Explicit overrides stay on instances until applied.
const key='warlike.prefabs.library.v1';
// A single-object prefab stores reusable component data, never an instance's
// identity, parent link, source metadata or selection-specific editor state.
const clean=o=>{
 const {id,name,x,y,parentId,sceneObjectId,prefabSourceId,prefabOverrides,inspectorOrder,...components}=o;
 return structuredClone(components);
};
const rawPrefabs=storage=>{
 try{const data=JSON.parse(storage.getItem(key)||'[]');return Array.isArray(data)?data.filter(p=>p&&typeof p.id==='string'&&p.components&&typeof p.components==='object'):[]}
 catch{return []}
};
export function readPrefabs(storage=globalThis.localStorage){
 const stored=rawPrefabs(storage),byId=new Map(stored.map(p=>[p.id,p])),resolved=new Map();
 const resolve=(prefab,stack=new Set())=>{
  if(resolved.has(prefab.id))return resolved.get(prefab.id);
  if(!prefab.basePrefabId){resolved.set(prefab.id,prefab);return prefab}
  if(stack.has(prefab.id))throw Error('Cycle de variantes prefab');
  const base=byId.get(prefab.basePrefabId);
  if(!base)throw Error('Source de variante absente');
  const result=resolvePrefabVariant(prefab,resolve(base,new Set([...stack,prefab.id])));
  resolved.set(prefab.id,result);return result;
 };
 return stored.map(p=>{try{return resolve(p)}catch{return {...p,invalidVariant:true}}});
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
 if(prefab?.invalidVariant)throw Error('Variante de prefab invalide : source parent absente ou cyclique');
 if(!prefab?.components)throw Error('Prefab invalide');
 const fresh=structuredClone(prefab.components);
 // Legacy user prefabs might already contain source-instance metadata.
 for(const field of ['id','name','x','y','parentId','sceneObjectId','prefabSourceId','prefabOverrides','inspectorOrder'])delete fresh[field];
 return {...fresh,id:nextId,name:prefab.name+' '+nextId,x,y,prefabSourceId:prefab.id,prefabOverrides:[]};
}
export function applyPrefabChanges(prefab,entity,instances){
 if(!prefab||!entity||entity.prefabSourceId!==prefab.id)throw Error('Instance incompatible');
 const next={...prefab,components:clean(entity)};
 const affected=instances.map(item=>{
  if(item.prefabSourceId!==prefab.id||item.id===entity.id)return item;
  const preserved=new Set(['id','name','x','y','prefabSourceId','prefabOverrides',...(item.prefabOverrides||[])]);
  const copy={...item};
  // Remove source properties that were deliberately deleted on the authored
  // prefab. Instance identity, placement and explicit per-instance overrides
  // are never altered. This also preserves unrelated legacy component data.
  for(const property of Object.keys(prefab.components)){
   if(!Object.hasOwn(next.components,property)&&!preserved.has(property))delete copy[property];
  }
  for(const [property,value] of Object.entries(next.components)){
   if(!preserved.has(property))copy[property]=structuredClone(value);
  }
  return copy;
 });
 return {prefab:next,instances:affected};
}
export function updatePrefab(prefab,storage=globalThis.localStorage){
 const list=rawPrefabs(storage),index=list.findIndex(p=>p.id===prefab.id);
 if(index<0)throw Error('Prefab absent');
 list[index]=prefab;storage.setItem(key,JSON.stringify(list));changed();
}


// Hierarchical prefabs v2. Additive format: old .components is still the root,
// and old instantiatePrefab() continues to return exactly one object.
// Each node has a stable local key. Never persist scene IDs as prefab identity.
const idOf=value=>typeof value==='number'&&Number.isSafeInteger(value)&&value>=0;
const hierarchyFields=new Set(['id','name','parentId','prefabSourceId','prefabOverrides','prefabNodeKey','inspectorOrder','sceneObjectId']);
const cleanHierarchyNode=object=>{
 const data=structuredClone(object);
 for(const field of hierarchyFields)delete data[field];
 return data;
};
function validateHierarchy(nodes){
 if(!Array.isArray(nodes)||!nodes.length||nodes.length>1000)throw Error('Hiérarchie de prefab invalide ou trop volumineuse');
 const map=new Map();
 for(const node of nodes){
  if(!node||typeof node.key!=='string'||!node.key||map.has(node.key)||!node.data||typeof node.data!=='object'||Array.isArray(node.data))
   throw Error('Nœud prefab invalide ou dupliqué');
  map.set(node.key,node);
 }
 const roots=nodes.filter(node=>node.parentKey==null);
 if(roots.length!==1)throw Error('Un prefab hiérarchique doit posséder une seule racine');
 for(const node of nodes){
  if(node.parentKey==null)continue;
  if(!map.has(node.parentKey))throw Error('Parent prefab introuvable');
  const seen=new Set([node.key]);let cursor=node;
  while(cursor.parentKey!=null){
   if(seen.has(cursor.parentKey))throw Error('Cycle de parenté prefab');
   seen.add(cursor.parentKey);cursor=map.get(cursor.parentKey);
  }
 }
 return roots[0].key;
}
export function makePrefabHierarchy(root,sceneEntities,{mode=null}={}){
 if(!root||!idOf(root.id)||!Array.isArray(sceneEntities))throw Error('Racine de prefab invalide');
 const byId=new Map();
 for(const entity of sceneEntities){
  if(!idOf(entity?.id)||byId.has(entity.id))throw Error('Objets de scène invalides ou identifiants en double');
  byId.set(entity.id,entity);
 }
 if(!byId.has(root.id))throw Error('La racine est absente de la scène');
 const selected=new Set([root.id]),todo=[root.id];
 while(todo.length){
  const id=todo.shift();
  for(const e of sceneEntities)if(e.parentId===id&&!selected.has(e.id)){selected.add(e.id);todo.push(e.id)}
 }
 const keyFor=id=>'node-'+id;
 const nodes=sceneEntities.filter(e=>selected.has(e.id)).map(e=>{
  const data=cleanHierarchyNode(e);
  // Preserve intra-prefab joint links, remapping only references to members.
  if(data.joint3d&&selected.has(Number(data.joint3d.targetId))){
   data.joint3d.targetNodeKey=keyFor(Number(data.joint3d.targetId));
   delete data.joint3d.targetId;
  }
  return {key:keyFor(e.id),parentKey:e.id===root.id?null:keyFor(e.parentId),name:e.name||'GameObject',data};
 });
 validateHierarchy(nodes);
 return {version:2,name:root.name||'Prefab',mode:mode||(['2d','3d'].includes(root.mode)?root.mode:root.type==='mesh3d'?'3d':'2d'),
  rootKey:keyFor(root.id),nodes,components:clean(root)};
}
export function savePrefabHierarchy(root,sceneEntities,storage=globalThis.localStorage,{mode=null}={}){
 const hierarchy=makePrefabHierarchy(root,sceneEntities,{mode});
 const entries=readPrefabs(storage);
 const id='prefab-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7);
 const prefab={...hierarchy,id};entries.push(prefab);
 storage.setItem(key,JSON.stringify(entries));changed();return prefab;
}
export function instantiatePrefabHierarchy(prefab,nextId,x=120,y=120){
 if(prefab?.invalidVariant)throw Error('Variante de prefab invalide : source parent absente ou cyclique');
 if(!idOf(nextId))throw Error('Identifiant de prefab invalide');
 if(!Array.isArray(prefab?.nodes)||!prefab.nodes.length){
  return {entities:[instantiatePrefab(prefab,nextId,x,y)],nextId:nextId+1,rootId:nextId};
 }
 const rootKey=validateHierarchy(prefab.nodes);
 // Parent-first ordering avoids transient missing parents during insertion.
 const ordered=[],remaining=new Map(prefab.nodes.map(node=>[node.key,node]));
 while(remaining.size){
  let moved=false;
  for(const [nodeKey,node] of remaining)if(node.parentKey==null||ordered.some(n=>n.key===node.parentKey)){
   ordered.push(node);remaining.delete(nodeKey);moved=true;
  }
  if(!moved)throw Error('Hiérarchie de prefab non résolue');
 }
 const assigned=new Map(ordered.map((node,i)=>[node.key,nextId+i]));
 const entities=ordered.map(node=>{
  const source=structuredClone(node.data);
  for(const field of hierarchyFields)delete source[field];
  const entity={...source,id:assigned.get(node.key),name:node.name+(node.key===rootKey?' '+nextId:''),
   parentId:node.parentKey==null?null:assigned.get(node.parentKey),
   prefabSourceId:prefab.id,prefabNodeKey:node.key,prefabOverrides:[]};
  if(node.key===rootKey){entity.x=x;entity.y=y}
  if(entity.joint3d?.targetNodeKey){
   entity.joint3d.targetId=assigned.get(entity.joint3d.targetNodeKey)??0;
   delete entity.joint3d.targetNodeKey;
  }
  return entity;
 });
 return {entities,nextId:nextId+entities.length,rootId:assigned.get(rootKey)};
}
export function createPrefabVariant(base,overrides={},name=(base?.name||'Prefab')+' Variant'){
 if(!base?.id||!Array.isArray(base.nodes))throw Error('Prefab parent hiérarchique requis');
 validateHierarchy(base.nodes);
 const keys=new Set(base.nodes.map(n=>n.key));
 for(const [nodeKey,fields] of Object.entries(overrides)){
  if(!keys.has(nodeKey)||!fields||typeof fields!=='object'||Array.isArray(fields))
   throw Error('Override de variante invalide');
  if(Object.keys(fields).some(field=>hierarchyFields.has(field)||field==='key'||field==='parentKey'))
   throw Error('Les overrides ne peuvent pas modifier la structure ou les identifiants');
 }
 return {version:2,id:'variant-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7),
  basePrefabId:base.id,name,mode:base.mode,overrides:structuredClone(overrides)};
}
export function savePrefabVariant(base,overrides={},storage=globalThis.localStorage,{name=null}={}){
 const source=readPrefabs(storage).find(p=>p.id===base?.id);
 if(!source||source.invalidVariant)throw Error('La source de cette variante doit être enregistrée dans la bibliothèque');
 const variant=createPrefabVariant(source,overrides,name||source.name+' Variant');
 const stored={...variant,components:structuredClone(source.components)};
 const all=rawPrefabs(storage);all.push(stored);storage.setItem(key,JSON.stringify(all));changed();
 return resolvePrefabVariant(stored,source);
}
export function resolvePrefabVariant(variant,base){
 if(!variant?.basePrefabId||variant.basePrefabId!==base?.id||!Array.isArray(base.nodes))throw Error('Variante et prefab parent incompatibles');
 validateHierarchy(base.nodes);
 const nodes=structuredClone(base.nodes);
 for(const node of nodes)for(const [property,value] of Object.entries(variant.overrides?.[node.key]||{})){
  if(hierarchyFields.has(property)||property==='key'||property==='parentKey')throw Error('Override de structure interdit');
  node.data[property]=structuredClone(value);
 }
 return {...structuredClone(base),id:variant.id,name:variant.name||base.name,basePrefabId:base.id,nodes};
}
