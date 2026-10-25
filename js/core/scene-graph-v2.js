// WarLike Core V2 — independent, versioned scene graph. No browser dependency.
const clone=value=>structuredClone(value);
const finite=n=>typeof n==='number'&&Number.isFinite(n);
const vector=(input,defaultValue)=>Array.isArray(input)&&input.length===3&&input.every(finite)?[...input]:[...defaultValue];
export function createScene(name='Untitled'){
 return {schema:'warlike.scene.v2',id:'scene-'+crypto.randomUUID(),name,objects:[]};
}
export function createGameObject(name='GameObject',id=crypto.randomUUID()){
 return {id,name,parentId:null,active:true,components:[
  {type:'Transform',position:[0,0,0],rotation:[0,0,0],scale:[1,1,1]}
 ]};
}
export function addGameObject(scene,object,parentId=null){
 if(!scene?.objects||!object?.id||scene.objects.some(o=>o.id===object.id))throw Error('GameObject invalide ou identifiant en double');
 if(parentId!==null&&!scene.objects.some(o=>o.id===parentId))throw Error('Parent introuvable');
 object.parentId=parentId;scene.objects.push(object);return object;
}
export function addComponent(object,component){
 if(!object?.components||!component?.type||typeof component.type!=='string')throw Error('Composant invalide');
 if(component.type==='Transform'&&object.components.some(c=>c.type==='Transform'))throw Error('Transform unique par GameObject');
 const entry=clone(component);object.components.push(entry);return entry;
}
export function reparent(scene,id,parentId){
 const object=scene.objects.find(o=>o.id===id);
 if(!object||parentId!==null&&!scene.objects.some(o=>o.id===parentId))throw Error('Objet ou parent inconnu');
 let next=parentId;const seen=new Set([id]);
 while(next!==null){if(seen.has(next))throw Error('Parentage cyclique');seen.add(next);next=scene.objects.find(o=>o.id===next)?.parentId??null}
 object.parentId=parentId;return object;
}
export function validateScene(scene){
 const errors=[];if(scene?.schema!=='warlike.scene.v2'||!Array.isArray(scene.objects))return ['Schéma de scène invalide'];
 const ids=new Set();
 for(const object of scene.objects){
  if(!object||typeof object.id!=='string'||!object.id||ids.has(object.id)){errors.push('ID manquant ou dupliqué');continue}
  ids.add(object.id);
  if(!Array.isArray(object.components)||object.components.filter(c=>c?.type==='Transform').length!==1){errors.push(object.id+': Transform requis et unique');continue}
  const t=object.components.find(c=>c.type==='Transform');
  for(const field of ['position','rotation','scale'])if(!Array.isArray(t[field])||t[field].length!==3||!t[field].every(finite))errors.push(object.id+': '+field+' invalide');
  if(Array.isArray(t.scale)&&t.scale.some(n=>n===0))errors.push(object.id+': échelle nulle');
 }
 for(const object of scene.objects){
  if(!object?.id||!ids.has(object.id))continue;
  if(object.parentId!==null&&object.parentId!==undefined&&!ids.has(object.parentId))errors.push(object.id+': parent absent');
  const visited=new Set([object.id]);let parent=object.parentId;
  while(parent!==null&&parent!==undefined){if(visited.has(parent)){errors.push(object.id+': cycle de parentage');break}visited.add(parent);parent=scene.objects.find(o=>o.id===parent)?.parentId}
 }
 return errors;
}
export function serializeScene(scene){const errors=validateScene(scene);if(errors.length)throw Error(errors.join('; '));return JSON.stringify(scene,null,2)}
export function deserializeScene(json){const scene=JSON.parse(json);const errors=validateScene(scene);if(errors.length)throw Error(errors.join('; '));return clone(scene)}
export function duplicateGameObject(scene,id){
 const original=scene.objects.find(o=>o.id===id);if(!original)throw Error('GameObject introuvable');
 const copy=clone(original);copy.id=crypto.randomUUID();copy.name+=' Copy';scene.objects.push(copy);return copy;
}
export function removeGameObject(scene,id){
 const removed=new Set([id]);let size;
 do{size=removed.size;for(const object of scene.objects)if(removed.has(object.parentId))removed.add(object.id)}while(size!==removed.size);
 scene.objects=scene.objects.filter(o=>!removed.has(o.id));return removed.size;
}
