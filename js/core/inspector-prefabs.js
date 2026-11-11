const instanceKeys=new Set(['id','name','x','y','parentId','prefabSourceId','prefabOverrides','prefabNodeKey','inspectorOrder','sceneObjectId']);
function templateFor(prefab,entity,instances=[]){
 if(!prefab?.components||entity?.prefabSourceId!==prefab.id)return null;
 if(!Array.isArray(prefab.nodes)||!prefab.nodes.length)return prefab.components;
 const node=prefab.nodes.find(n=>n.key===entity.prefabNodeKey);
 if(!node)return null;
 const template=structuredClone(node.data);
 if(template.joint3d?.targetNodeKey){
  const instance=instances.find(item=>item.prefabSourceId===prefab.id&&item.prefabNodeKey===template.joint3d.targetNodeKey);
  if(instance)template.joint3d.targetId=instance.id;
  delete template.joint3d.targetNodeKey;
 }
 return template;
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
