import {stopAnimationEditorPreviews} from './animation-clips.js';
// User-defined scene prefabs. Explicit overrides stay on instances until applied.
const key='warlike.prefabs.library.v1';
// A single-object prefab stores reusable component data, never an instance's
// identity, parent link, source metadata or selection-specific editor state.
const clean=o=>{
 const {id,name,x,y,parentId,sceneObjectId,prefabSourceId,prefabOverrides,inspectorOrder,...components}=o;
 for(const field of ['prefabNodeKey','prefabInstanceRootId','prefabLinks'])delete components[field];return structuredClone(components);
};
const rawPrefabs=(storage,strict=false)=>{
 try{const data=JSON.parse(storage.getItem(key)||'[]');if(!Array.isArray(data)||strict&&data.some(p=>!p||typeof p!=='object'||Array.isArray(p)))throw Error('Bibliothèque prefab invalide.');return strict?data:data.filter(p=>p&&typeof p.id==='string'&&p.components&&typeof p.components==='object')}
 catch(error){if(strict)throw Error('Bibliothèque prefab illisible : données conservées. '+error.message);return []}
};
export function readPrefabs(storage=globalThis.localStorage){
 const stored=rawPrefabs(storage),byId=new Map(stored.map(p=>[p.id,p])),resolved=new Map();
 const resolve=(prefab,stack=new Set())=>{
  if(resolved.has(prefab.id))return resolved.get(prefab.id);
  if(!prefab.basePrefabId){if(stack.has(prefab.id)||stack.size>=16)throw Error('Cycle ou profondeur de prefabs imbriqués');const result=resolveNestedPrefab(prefab,id=>{const source=byId.get(id);if(!source)throw Error('Source imbriquée absente : '+id);return resolve(source,new Set([...stack,prefab.id]))});resolved.set(prefab.id,result);return result}
  if(stack.has(prefab.id))throw Error('Cycle de variantes prefab');
  const base=byId.get(prefab.basePrefabId);
  if(!base)throw Error('Source de variante absente');
  const variant=resolvePrefabVariant(prefab,resolve(base,new Set([...stack,prefab.id])));const result=resolveNestedPrefab(variant,id=>{const source=byId.get(id);if(!source)throw Error('Source imbriquée absente : '+id);return resolve(source,new Set([...stack,prefab.id]))});
  resolved.set(prefab.id,result);return result;
 };
 return stored.map(p=>{try{return resolve(p)}catch(error){return {...p,invalidVariant:true,prefabError:error.message}}});
}
export const prefabMode=prefab=>['2d','3d'].includes(prefab?.mode)?prefab.mode:prefab?.components?.type==='mesh3d'||prefab?.components?.collider3d||prefab?.components?.controller3d||prefab?.components?.rigidbody3d?'3d':'2d';
export const prefabsForMode=(prefabs,mode)=>prefabs.filter(p=>prefabMode(p)===mode);
const changed=()=>globalThis.document?.dispatchEvent?.(new Event('warlike:prefabs'));
export function savePrefab(entity,storage=globalThis.localStorage,{mode=null}={}){
 if(!entity||typeof entity!=='object')throw Error('Sélectionne un objet valide');
 stopAnimationEditorPreviews([entity]);
 const entries=rawPrefabs(storage,true),id='prefab-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7);
 const prefab={id,name:entity.name||'Prefab',components:clean(entity)};prefab.mode=['2d','3d'].includes(mode)?mode:prefabMode(prefab);
 entries.push(prefab);writePrefabLibrary(storage,entries);changed();return prefab;
}
export function instantiatePrefab(prefab,nextId,x=120,y=120){
 if(prefab?.invalidVariant)throw Error('Variante de prefab invalide : source parent absente ou cyclique');
 if(!prefab?.components)throw Error('Prefab invalide');
 const fresh=structuredClone(prefab.components);
 // Legacy user prefabs might already contain source-instance metadata.
 for(const field of ['id','name','x','y','parentId','sceneObjectId','prefabSourceId','prefabOverrides','prefabNodeKey','prefabInstanceRootId','prefabLinks','inspectorOrder'])delete fresh[field];
 return {...fresh,id:nextId,name:prefab.name+' '+nextId,x,y,prefabSourceId:prefab.id,prefabOverrides:[]};
}
export function applyPrefabChanges(prefab,entity,instances){
 if(prefab?.nodes)throw Error('Utiliser l’application de propriétés hiérarchiques pour ce prefab.');
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
 const list=rawPrefabs(storage,true),index=list.findIndex(p=>p.id===prefab.id);
 if(index<0)throw Error('Prefab absent');
 if(list[index].nodes?.some(n=>n.nested)&&!prefab.nodes?.some(n=>n.nested))throw Error('Une source imbriquée ne peut pas être aplatie : appliquer les propriétés du nœud.');
 list[index]=prefab;writePrefabLibrary(storage,list);changed();
}


// Hierarchical prefabs v4. Additive format: old .components is still the root,
// and old instantiatePrefab() continues to return exactly one object.
// Each node has a stable local key. Never persist scene IDs as prefab identity.
const idOf=value=>typeof value==='number'&&Number.isSafeInteger(value)&&value>=0;
const hierarchyFields=new Set(['id','name','parentId','prefabSourceId','prefabOverrides','prefabNodeKey','prefabInstanceRootId','prefabLinks','inspectorOrder','sceneObjectId']);
const cleanHierarchyNode=object=>{
 const data=structuredClone(object);
 for(const field of hierarchyFields)delete data[field];
 return data;
};
// Only declared object-reference fields are remapped. Arbitrary script numbers
// and external scene links retain their original meaning.
export function prefabReferenceSlots(data){
 const slots=[];
 for(const path of ['joint2d','joint3d','socket3d','sceneCamera3d','camera2d','navigationAgent']){
  const value=data?.[path];if(value&&typeof value==='object'&&!Array.isArray(value))slots.push({path,value});
 }
 for(const [i,value] of (Array.isArray(data?.animationRig?.ik)?data.animationRig.ik:[]).entries())if(value&&typeof value==='object')slots.push({path:'animationRig.ik.'+i,value});
 return slots;
}
export function prefabObjectReferences(prefab){
 const nodes=new Map((prefab.nodes||[]).map(node=>[node.key,node])),references=Object.create(null);
 // Legacy v2/v3 keys encode the source IDs. Resolve only an unambiguous local
 // member; never rewrite the stored legacy definition during a read.
 for(const node of nodes.values())for(const {path,value} of prefabReferenceSlots(node.data)){
  const target='node-'+value.targetId;if(Number.isSafeInteger(value.targetId)&&value.targetId>0&&nodes.has(target))(references[node.key]??={})[path]=target;
 }
 if(prefab.objectReferences!=null&&(typeof prefab.objectReferences!=='object'||Array.isArray(prefab.objectReferences)))throw Error('Références de prefab invalides');
 for(const [source,links] of Object.entries(prefab.objectReferences||{})){
  if(!nodes.has(source)||!links||typeof links!=='object'||Array.isArray(links))throw Error('Source de référence prefab absente');
  const slots=new Map(prefabReferenceSlots(nodes.get(source).data).map(slot=>[slot.path,slot.value]));
  for(const [path,target] of Object.entries(links)){
   if(!slots.has(path))continue; // An explicit component deletion removes its links too.
   if(target===null){if(references[source])delete references[source][path];continue;}
   if(typeof target!=='string'||!nodes.has(target))throw Error('Cible de référence prefab absente : '+target);
   (references[source]??={})[path]=target;
  }
 }
 // Property overrides may explicitly retarget a reference using a stable key.
 for(const node of nodes.values())for(const {path,value} of prefabReferenceSlots(node.data))if(value.targetNodeKey!=null){
  if(typeof value.targetNodeKey!=='string'||!nodes.has(value.targetNodeKey))throw Error('Cible de référence prefab absente : '+value.targetNodeKey);
  (references[node.key]??={})[path]=value.targetNodeKey;
 }
 return references;
}
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
export function makePrefabHierarchy(root,sceneEntities,{mode=null,prefabs=[]}={}){
 if(!root||!idOf(root.id)||!Array.isArray(sceneEntities))throw Error('Racine de prefab invalide');
 const byId=new Map();
 for(const entity of sceneEntities){
  if(!idOf(entity?.id)||byId.has(entity.id))throw Error('Objets de scène invalides ou identifiants en double');
  byId.set(entity.id,entity);
 }
 if(!byId.has(root.id))throw Error('La racine est absente de la scène');
 stopAnimationEditorPreviews(sceneEntities);
 const selected=new Set([root.id]),todo=[root.id];
 while(todo.length){
  const id=todo.shift();
  for(const e of sceneEntities)if(e.parentId===id&&!selected.has(e.id)){selected.add(e.id);todo.push(e.id)}
 }
 const nestedRoots=new Map(),omitted=new Set();
 for(const e of sceneEntities)if(selected.has(e.id)&&e.id!==root.id&&e.prefabSourceId&&(!byId.get(e.parentId)||byId.get(e.parentId).prefabSourceId!==e.prefabSourceId||e.prefabInstanceRootId===e.id)){
  const source=prefabs.find(p=>p.id===e.prefabSourceId);if(!source||source.invalidVariant||!source.nodes)throw Error('Source du prefab enfant absente ou invalide : '+e.prefabSourceId);
  nestedRoots.set(e.id,source);
 }
 // Only outermost nested roots become authored slots. Their complete source
 // trees are expanded dynamically by readPrefabs, never baked as stale copies.
 for(const id of nestedRoots.keys()){let parent=byId.get(id)?.parentId;const seen=new Set();while(parent!=null&&!seen.has(parent)){seen.add(parent);if(nestedRoots.has(parent)){nestedRoots.delete(id);break}parent=byId.get(parent)?.parentId}}
 for(const e of sceneEntities)if(selected.has(e.id)){let parent=e.parentId;const seen=new Set();while(parent!=null&&!seen.has(parent)){seen.add(parent);if(nestedRoots.has(parent)){omitted.add(e.id);break}parent=byId.get(parent)?.parentId}}
 const keyFor=id=>'node-'+id;
 const referenceKeyFor=id=>{
  const entity=byId.get(id);if(!entity||!selected.has(id))return null;
  for(const [rootId,source] of nestedRoots)if(id!==rootId&&isDescendantOf(entity,rootId,byId)){
   const local=entity.prefabLinks?.find(link=>link.prefabId===source.id&&link.rootId===rootId)?.nodeKey||entity.prefabNodeKey;
   if(!source.nodes.some(node=>node.key===local))throw Error('Nœud de référence imbriqué absent');
   return keyFor(rootId)+'/'+local;
  }
  return keyFor(id);
 };
 const objectReferences={};
 for(const entity of sceneEntities)if(selected.has(entity.id))for(const {path,value} of prefabReferenceSlots(entity)){
  const target=referenceKeyFor(value.targetId),owner=referenceKeyFor(entity.id);
  let inherited=null;
  for(const [rootId,source] of nestedRoots)if(entity.id===rootId||isDescendantOf(entity,rootId,byId)){
   const local=entity.prefabLinks?.find(link=>link.prefabId===source.id&&link.rootId===rootId)?.nodeKey||entity.prefabNodeKey;
   const link=prefabObjectReferences(source)[local]?.[path],sourceRoot=source.nodes.find(node=>node.parentKey==null).key;
   if(link)inherited=link===sourceRoot?keyFor(rootId):keyFor(rootId)+'/'+link;
   break;
  }
  if(target!==inherited&&(target||inherited))(objectReferences[owner]??={})[path]=target;
 }
 const nodes=sceneEntities.filter(e=>selected.has(e.id)&&!omitted.has(e.id)).map(e=>{
  if(nestedRoots.has(e.id)){
   const source=nestedRoots.get(e.id),members=sceneEntities.filter(o=>o.id===e.id||isDescendantOf(o,e.id,byId)),overrides={},removedProperties={};
   if(members.length!==source.nodes.length)throw Error('Structure du prefab enfant modifiée : enregistrer une nouvelle composition enfant avant le parent.');
   const origin=source.nodes.find(n=>n.parentKey==null).data;
   for(const item of members){
    const sourceKey=object=>object.prefabLinks?.find(l=>l.prefabId===source.id&&l.rootId===e.id)?.nodeKey||object.prefabNodeKey;
    const nodeKey=sourceKey(item),template=source.nodes.find(n=>n.key===nodeKey);
    if(!template)throw Error('Structure enfant modifiée : enregistrer d’abord le prefab enfant.');
    const data=cleanHierarchyNode(item),baseline=structuredClone(template.data);
    if(item.id!==e.id){data.x=(data.x||0)-(e.x||0)+(origin.x||0);data.y=(data.y||0)-(e.y||0)+(origin.y||0)}
    const sourceReferences=prefabObjectReferences(source)[nodeKey]||{};
    for(const {path,value} of prefabReferenceSlots(baseline))if(sourceReferences[path]){value.targetNodeKey=sourceReferences[path];delete value.targetId;}
    for(const {path,value} of prefabReferenceSlots(data))if(value.targetId){
     const target=members.find(m=>m.id===value.targetId),targetKey=target&&sourceKey(target);
     if(targetKey){value.targetNodeKey=targetKey;delete value.targetId;}
     else if(path==='joint3d'||path==='joint2d')throw Error('Articulation externe au prefab enfant.');
    }
    if(item.id===e.id)for(const field of ['x','y']){delete data[field];delete baseline[field]}
    const diff=diffPrefabData(baseline,data);
    if(Object.keys(diff.patch).length)overrides[nodeKey]=diff.patch;
    if(diff.removed.length)removedProperties[nodeKey]=diff.removed;
   }
   return {key:keyFor(e.id),parentKey:keyFor(e.parentId),name:e.name,data:{x:e.x,y:e.y},nested:{prefabId:source.id,overrides,removedProperties}};
  }
  const data=cleanHierarchyNode(e);
  // Preserve intra-prefab joint links, remapping only references to members.
  for(const joint of ['joint3d','joint2d'])if(data[joint]?.enabled!==false&&data[joint]?.targetId){
   if(!selected.has(Number(data[joint].targetId)))
    throw Error('Articulation externe au prefab : inclus aussi sa cible dans la hiérarchie.');
   data[joint].targetNodeKey=referenceKeyFor(Number(data[joint].targetId));
   delete data[joint].targetId;
  }
  return {key:keyFor(e.id),parentKey:e.id===root.id?null:keyFor(e.parentId),name:e.name||'GameObject',data};
 });
 validateHierarchy(nodes);
 return {version:4,coordinateSpace:'legacy-world',name:root.name||'Prefab',mode:mode||(['2d','3d'].includes(root.mode)?root.mode:root.type==='mesh3d'?'3d':'2d'),
  rootKey:keyFor(root.id),nodes,objectReferences,components:clean(root)};
}
export function savePrefabHierarchy(root,sceneEntities,storage=globalThis.localStorage,{mode=null}={}){
 const hierarchy=makePrefabHierarchy(root,sceneEntities,{mode,prefabs:readPrefabs(storage)});
 const entries=rawPrefabs(storage,true);
 const id='prefab-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7);
 const prefab={...hierarchy,id};entries.push(prefab);const preview=readPrefabs({getItem:()=>JSON.stringify(entries)}).find(p=>p.id===id);if(preview?.invalidVariant)throw Error(preview.prefabError);
 writePrefabLibrary(storage,entries);changed();return prefab;
}
export function instantiatePrefabHierarchy(prefab,nextId,x=120,y=120){
 if(prefab?.nodes?.some(n=>n.nested))throw Error('Résoudre les sources des prefabs imbriqués depuis la bibliothèque avant instanciation.');
 if(prefab?.invalidVariant)throw Error('Variante de prefab invalide : source parent absente ou cyclique');
 if(!idOf(nextId)||nextId+(prefab?.nodes?.length||1)>Number.MAX_SAFE_INTEGER)throw Error('Identifiant de prefab invalide');
 if(!Array.isArray(prefab?.nodes)||!prefab.nodes.length){
  return {entities:[instantiatePrefab(prefab,nextId,x,y)],nextId:nextId+1,rootId:nextId};
 }
 const rootKey=validateHierarchy(prefab.nodes);
 const references=prefabObjectReferences(prefab);
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
   prefabSourceId:prefab.id,prefabNodeKey:node.key,prefabInstanceRootId:assigned.get(rootKey),prefabOverrides:[],prefabLinks:[{prefabId:prefab.id,nodeKey:node.key,rootId:assigned.get(rootKey)},...(node.sourceLinks||[]).map(link=>({prefabId:link.prefabId,nodeKey:link.nodeKey,rootId:assigned.get(link.scopeKey)}))]};
  const closest=entity.prefabLinks.at(-1);entity.prefabSourceId=closest.prefabId;entity.prefabNodeKey=closest.nodeKey;entity.prefabInstanceRootId=closest.rootId;
  if(prefab.coordinateSpace==='legacy-world'&&node.key!==rootKey){const origin=prefab.nodes.find(n=>n.key===rootKey).data;entity.x=(entity.x||0)+x-(origin.x||0);entity.y=(entity.y||0)+y-(origin.y||0)}if(node.key===rootKey){entity.x=x;entity.y=y}
  for(const joint of ['joint3d','joint2d'])if(entity[joint]?.targetNodeKey){if(!assigned.has(entity[joint].targetNodeKey))throw Error('Cible d’articulation prefab absente.');entity[joint].targetId=assigned.get(entity[joint].targetNodeKey);delete entity[joint].targetNodeKey;}
  for(const {path,value} of prefabReferenceSlots(entity))if(references[node.key]?.[path]){value.targetId=assigned.get(references[node.key][path]);delete value.targetNodeKey;}
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
export function savePrefabVariant(base,overrides={},storage=globalThis.localStorage,{name=null,removedProperties={}}={}){
 const source=readPrefabs(storage).find(p=>p.id===base?.id);
 if(!source||source.invalidVariant)throw Error('La source de cette variante doit être enregistrée dans la bibliothèque');
 const variant=createPrefabVariant(source,overrides,name||source.name+' Variant');
 const stored={...variant,removedProperties:structuredClone(removedProperties),components:structuredClone(source.components)};resolvePrefabVariant(stored,source);
 const all=rawPrefabs(storage,true);all.push(stored);writePrefabLibrary(storage,all);changed();
 return resolvePrefabVariant(stored,source);
}
export function resolvePrefabVariant(variant,base){
 if(!variant?.basePrefabId||variant.basePrefabId!==base?.id||!Array.isArray(base.nodes))throw Error('Variante et prefab parent incompatibles');
 validateHierarchy(base.nodes);
 const nodes=structuredClone(base.nodes),objectReferences=structuredClone(base.objectReferences||{});for(const key of Object.keys(variant.overrides||{}))if(!nodes.some(n=>n.key===key))throw Error('Nœud de variante absent : '+key);
 for(const node of nodes)for(const [property,value] of Object.entries(variant.overrides?.[node.key]||{})){
  if(hierarchyFields.has(property)||property==='key'||property==='parentKey')throw Error('Override de structure interdit');
  node.data[property]=mergePrefabValue(node.data[property],value);
 }
 for(const node of nodes)for(const {path,value} of prefabReferenceSlots(variant.overrides?.[node.key]))if(Object.hasOwn(value,'targetId')||Object.hasOwn(value,'targetNodeKey')){
  if(Object.hasOwn(value,'targetId'))(objectReferences[node.key]??={})[path]=null;
  else if(objectReferences[node.key])delete objectReferences[node.key][path];
 }
 for(const [nodeKey,paths] of Object.entries(variant.removedProperties||{})){const node=nodes.find(n=>n.key===nodeKey);if(!node)throw Error('Nœud supprimé de la source de variante : '+nodeKey);if(!Array.isArray(paths)||paths.length>256)throw Error('Liste de suppressions de variante invalide.');for(const path of paths)deletePrefabPath(node.data,path);}
 return {...structuredClone(base),id:variant.id,name:variant.name||base.name,basePrefabId:base.id,overrides:structuredClone(variant.overrides||{}),removedProperties:structuredClone(variant.removedProperties||{}),nodes,objectReferences};
}

const unsafePrefabKey=key=>['__proto__','prototype','constructor'].includes(key);
function mergePrefabValue(base,patch,depth=0){
 if(depth>16)throw Error('Propriétés de prefab trop imbriquées');
 if(patch&&typeof patch==='object'&&!Array.isArray(patch)){
  const result=base&&typeof base==='object'&&!Array.isArray(base)?structuredClone(base):{};
  for(const [key,value] of Object.entries(patch)){if(unsafePrefabKey(key))throw Error('Propriété prefab réservée');result[key]=mergePrefabValue(result[key],value,depth+1)}
  if(Object.hasOwn(patch,'targetId')&&!Object.hasOwn(patch,'targetNodeKey'))delete result.targetNodeKey;
  if(Object.hasOwn(patch,'targetNodeKey')&&!Object.hasOwn(patch,'targetId'))delete result.targetId;
  return result;
 }return structuredClone(patch);
}
const isDescendantOf=(entity,rootId,byId)=>{let parent=entity.parentId;const seen=new Set();while(parent!=null&&!seen.has(parent)){if(parent===rootId)return true;seen.add(parent);parent=byId.get(parent)?.parentId}return false};
function resolveNestedPrefab(prefab,lookup){
 if(!prefab.nodes?.some(n=>n.nested)){if(prefab.nodes)prefabObjectReferences(prefab);return prefab;}
 validateHierarchy(prefab.nodes);const nodes=[],objectReferences={};
 for(const slot of prefab.nodes){
  if(!slot.nested){nodes.push(structuredClone(slot));continue}
  const source=lookup(slot.nested.prefabId);if(source.invalidVariant||!source.nodes)throw Error('Source imbriquée invalide');
  for(const key of new Set([...Object.keys(slot.nested.overrides||{}),...Object.keys(slot.nested.removedProperties||{})]))if(!source.nodes.some(n=>n.key===key))throw Error('Nœud imbriqué absent : '+key);
  const rootKey=validateHierarchy(source.nodes),qualify=key=>key===rootKey?slot.key:slot.key+'/'+key;
  for(const [owner,links] of Object.entries(prefabObjectReferences(source))){
   objectReferences[qualify(owner)]=Object.fromEntries(Object.entries(links).map(([path,target])=>[path,qualify(target)]));
  }
  for(const original of source.nodes){
   const node=structuredClone(original),patch=slot.nested.overrides?.[original.key]||{};
   for(const {path,value} of prefabReferenceSlots(patch))if(Object.hasOwn(value,'targetId')){
    (objectReferences[qualify(original.key)]??={})[path]=null;
   }
   for(const field of Object.keys(patch))if(hierarchyFields.has(field)||unsafePrefabKey(field))throw Error('Override imbriqué de structure interdit');
   node.data=mergePrefabValue(node.data,patch);const removed=slot.nested.removedProperties?.[original.key]||[];if(!Array.isArray(removed)||removed.length>256)throw Error('Liste de suppressions imbriquées invalide.');for(const path of removed)deletePrefabPath(node.data,path);node.key=qualify(original.key);node.parentKey=original.key===rootKey?slot.parentKey:qualify(original.parentKey);
   if(original.key===rootKey){node.name=slot.name||node.name;node.data=mergePrefabValue(node.data,slot.data)}
   for(const {value} of prefabReferenceSlots(node.data))if(value.targetNodeKey)value.targetNodeKey=qualify(value.targetNodeKey);
   if(original.key!==rootKey){const origin=source.nodes.find(n=>n.key===rootKey).data;node.data.x=(node.data.x||0)+(slot.data.x||0)-(origin.x||0);node.data.y=(node.data.y||0)+(slot.data.y||0)-(origin.y||0)}
   node.sourceLinks=[{prefabId:source.id,nodeKey:original.key,scopeKey:slot.key},...(original.sourceLinks||[]).map(link=>({...link,scopeKey:qualify(link.scopeKey)}))];
   if(node.sourceLinks.length>=16)throw Error('Profondeur de prefab imbriqué dépassée.');
   nodes.push(node);
  }
  if(nodes.length>1000)throw Error('Limite de 1000 objets dans le prefab développé.');
 }
 for(const [owner,links] of Object.entries(prefab.objectReferences||{}))objectReferences[owner]={...objectReferences[owner],...links};
 validateHierarchy(nodes);const result={...prefab,nodes,objectReferences,components:structuredClone(nodes.find(n=>n.parentKey==null).data)};prefabObjectReferences(result);return result;
}
function writePrefabLibrary(storage,entries){
 const previous=storage.getItem(key)||'[]';
 if(storage.getItem(key+'.before-v3')==null)storage.setItem(key+'.before-v3',previous);
 if(storage.getItem(key+'.before-v4')==null)storage.setItem(key+'.before-v4',previous);
 storage.setItem(key,JSON.stringify(entries));
}
function deletePrefabPath(data,path){
 if(typeof path!=='string'||!path||path.length>1600)throw Error('Chemin de propriété prefab invalide.');
 const parts=path.split('.');if(parts.some(unsafePrefabKey)||hierarchyFields.has(parts[0]))throw Error('Suppression de structure interdite.');
 let parent=data;for(const part of parts.slice(0,-1)){if(!parent||typeof parent!=='object'||Array.isArray(parent))return;parent=parent[part]}if(parent&&typeof parent==='object')delete parent[parts.at(-1)];
}
export function updatePrefabNodeProperties(prefabId,nodeKey,patch,removed=[],storage=globalThis.localStorage){
 const all=rawPrefabs(storage,true),raw=all.find(p=>p.id===prefabId);if(!raw)throw Error('Source prefab absente');
 for(const field of Object.keys(patch))if(hierarchyFields.has(field)||unsafePrefabKey(field))throw Error('Modification de structure interdite');
 if(raw.basePrefabId){raw.overrides??={};raw.overrides[nodeKey]=mergePrefabValue(raw.overrides[nodeKey]||{},patch);raw.removedProperties??={};raw.removedProperties[nodeKey]=[...new Set([...(raw.removedProperties[nodeKey]||[]),...removed])].filter(path=>!patchTouchesPath(patch,path));}
 else {const node=raw.nodes?.find(n=>n.key===nodeKey);if(!node||node.nested)throw Error('Nœud source non éditable directement');node.data=mergePrefabValue(node.data,patch);for(const path of removed)deletePrefabPath(node.data,path);if(node.parentKey==null)raw.components=structuredClone(node.data);}
 for(const {path,value} of prefabReferenceSlots(patch))if(Object.hasOwn(value,'targetId')||Object.hasOwn(value,'targetNodeKey')){
  if(Object.hasOwn(value,'targetId')){raw.objectReferences??={};(raw.objectReferences[nodeKey]??={})[path]=null;}
  else if(raw.objectReferences?.[nodeKey])delete raw.objectReferences[nodeKey][path];
 }
 // Validate a virtual library before writing, including dependencies and cycles.
 const preview=readPrefabs({getItem:()=>JSON.stringify(all)}).find(p=>p.id===prefabId);if(preview?.invalidVariant)throw Error(preview.prefabError);
 writePrefabLibrary(storage,all);changed();return preview;
}
function diffPrefabData(base,next){
 const patch={},removed=[];const visit=(a,b,out,path='')=>{
  for(const field of new Set([...Object.keys(a||{}),...Object.keys(b||{})])){
   const at=path?path+'.'+field:field;if(!Object.hasOwn(b||{},field)){removed.push(at);continue}
   const old=a?.[field],value=b[field];if(JSON.stringify(old)===JSON.stringify(value))continue;
   if(old&&value&&typeof old==='object'&&typeof value==='object'&&!Array.isArray(old)&&!Array.isArray(value)){out[field]={};visit(old,value,out[field],at)}else out[field]=structuredClone(value);
  }
 };visit(base,next,patch);return {patch,removed};
}
function patchTouchesPath(patch,path){
 let value=patch;for(const part of path.split('.')){if(!value||typeof value!=='object'||Array.isArray(value))return true;if(!Object.hasOwn(value,part))return false;value=value[part]}return true;
}
