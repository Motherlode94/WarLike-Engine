const instanceKeys=new Set(['id','name','x','y','prefabSourceId','prefabOverrides','inspectorOrder']);
export function prefabPropertyOverrides(prefab,entity){
 if(!prefab?.components||entity?.prefabSourceId!==prefab.id)return [];
 return [...new Set([...Object.keys(prefab.components),...Object.keys(entity)])].filter(key=>!instanceKeys.has(key)&&JSON.stringify(prefab.components[key])!==JSON.stringify(entity[key]));
}
export function revertInspectorPrefab(prefab,entity){
 if(!prefab?.components||entity?.prefabSourceId!==prefab.id)return false;
 for(const key of Object.keys(entity))if(!instanceKeys.has(key)&&!Object.hasOwn(prefab.components,key))delete entity[key];
 for(const [key,value] of Object.entries(prefab.components))if(!instanceKeys.has(key))entity[key]=structuredClone(value);
 entity.prefabOverrides=[];return true;
}
