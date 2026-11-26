import {readPrefabs,updatePrefabNodeProperties,savePrefabVariant,prefabObjectReferences,prefabReferenceSlots} from './prefab-library.js';
const instanceKeys=new Set(['id','name','x','y','parentId','prefabSourceId','prefabOverrides','prefabNodeKey','prefabInstanceRootId','prefabLinks','inspectorOrder','sceneObjectId']);
function templateFor(prefab,entity,instances=[]){
 if(!prefab?.components||entity?.prefabSourceId!==prefab.id)return null;
 if(!Array.isArray(prefab.nodes)||!prefab.nodes.length)return prefab.components;
 const node=prefab.nodes.find(n=>n.key===entity.prefabNodeKey);
 if(!node)return null;
 const template=structuredClone(node.data);
 const references=prefabObjectReferences(prefab)[node.key]||{};
 for(const {path,value} of prefabReferenceSlots(template)){
  const key=references[path];
  const instance=key&&instances.find(item=>instanceNodeKey(prefab,entity,item,instances)===key);
  if(instance)value.targetId=instance.id;
  delete value.targetNodeKey;
 }
 return template;
}
function instanceNodeKey(prefab,owner,target,entities){
 const scope=owner.prefabLinks?.find(link=>link.prefabId===prefab.id)?.rootId??prefabInstanceRoot(owner,entities);
 const link=target.prefabLinks?.find(link=>link.prefabId===prefab.id&&link.rootId===scope);
 if(link)return link.nodeKey;
 if(target.prefabSourceId===prefab.id&&prefabInstanceRoot(target,entities)===scope)return target.prefabNodeKey;
 return null;
}
export function prefabPropertyOverrides(prefab,entity,instances=[]){
 const template=templateFor(prefab,entity,instances);if(!template)return [];
 return [...new Set([...Object.keys(template),...Object.keys(entity)])].filter(key=>!instanceKeys.has(key)&&JSON.stringify(template[key])!==JSON.stringify(entity[key]));
}
export function revertInspectorPrefab(prefab,entity,instances=[]){
 const template=templateFor(prefab,entity,instances);if(!template)return false;
 for(const key of Object.keys(entity))if(!instanceKeys.has(key)&&!Object.hasOwn(template,key))delete entity[key];
 for(const [key,value] of Object.entries(template))if(!instanceKeys.has(key))entity[key]=structuredClone(value);
 entity.prefabOverrides=[];return true;
}
export function prefabInstanceRoot(entity,entities){
 if(entity.prefabInstanceRootId!=null)return entity.prefabInstanceRootId;
 let current=entity;const seen=new Set();while(current.parentId!=null&&!seen.has(current.id)){seen.add(current.id);const parent=entities.find(e=>e.id===current.parentId);if(!parent||parent.prefabSourceId!==entity.prefabSourceId)break;current=parent}return current.id;
}
function diffFields(base,next){
 const patch={},removed=[];
 const visit=(a,b,out,path='')=>{for(const key of new Set([...Object.keys(a||{}),...Object.keys(b||{})])){if(!path&&instanceKeys.has(key))continue;const at=path?path+'.'+key:key;if(!Object.hasOwn(b||{},key)){removed.push(at);continue}const old=a?.[key],value=b[key];if(JSON.stringify(old)===JSON.stringify(value))continue;if(old&&value&&typeof old==='object'&&typeof value==='object'&&!Array.isArray(old)&&!Array.isArray(value)){out[key]={};visit(old,value,out[key],at)}else out[key]=structuredClone(value)}};
 visit(base,next,patch);return {patch,removed};
}
function sourceDifference(prefab,entity,entities){
 const template=templateFor(prefab,entity,entities);if(!template)throw Error('Nœud prefab absent.');const diff=diffFields(template,entity);
 for(const {path,value} of prefabReferenceSlots(diff.patch))if(value.targetId){
  const target=entities.find(e=>e.id===value.targetId),key=target&&instanceNodeKey(prefab,entity,target,entities);
  if(key){value.targetNodeKey=key;delete value.targetId;}
  else if(path==='joint2d'||path==='joint3d')throw Error('Cible d’articulation extérieure au prefab.');
 }
 return diff;
}
export function createInspectorPrefabVariant(prefab,entity,entities,storage=globalThis.localStorage){
 const {patch,removed}=sourceDifference(prefab,entity,entities),nodeKey=entity.prefabNodeKey;
 return savePrefabVariant(prefab,{[nodeKey]:patch},storage,{name:prefab.name+' · Variante',removedProperties:{[nodeKey]:removed}});
}
export function propagatePrefabProperties(before,after,entities){
 const result=structuredClone(entities);
 const merge=(old,next,current,depth=0)=>{const out=structuredClone(current||{});for(const key of new Set([...Object.keys(old||{}),...Object.keys(next||{})])){
  if(depth===0&&instanceKeys.has(key))continue;const a=old?.[key],b=next?.[key],v=current?.[key];if(JSON.stringify(a)===JSON.stringify(b))continue;
  if(JSON.stringify(v)===JSON.stringify(a)){if(b===undefined)delete out[key];else out[key]=structuredClone(b)}
  else if(a&&b&&v&&typeof a==='object'&&typeof b==='object'&&typeof v==='object'&&![a,b,v].some(Array.isArray))out[key]=merge(a,b,v,depth+1);
 }return out};
 for(const e of result)if(e.prefabSourceId===before.id){const prior=templateFor(before,e,result),next=templateFor(after,e,result);if(!prior||!next)continue;const updated=merge(prior,next,e);for(const property of e.prefabOverrides||[])if(Object.hasOwn(e,property))updated[property]=structuredClone(e[property]);for(const key of Object.keys(e))delete e[key];Object.assign(e,updated);}
 return result;
}
export function applyInspectorPrefab(prefab,entity,entities,storage=globalThis.localStorage){
 const previousLibrary=readPrefabs(storage),{patch,removed}=sourceDifference(prefab,entity,entities);
 updatePrefabNodeProperties(prefab.id,entity.prefabNodeKey,patch,removed,storage);
 let result=structuredClone(entities);for(const next of readPrefabs(storage)){const prior=previousLibrary.find(p=>p.id===next.id);if(prior&&!prior.invalidVariant&&!next.invalidVariant)result=propagatePrefabProperties(prior,next,result)}return result;
}
