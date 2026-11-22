// Project-local Animator Controller assets. The runtime retains each object's
// serialized graph snapshot, so Play and standalone Web export are independent
// of editor-only asset storage. No sample animations are synthesized.
import {inspectAnimatorGraph} from './animator-graph.js';
const clone=value=>structuredClone(value);
const validName=value=>typeof value==='string'&&value.trim().length>0&&value.trim().length<=120;
const validId=value=>typeof value==='string'&&/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/.test(value);
export const animatorAssetLimit=64;
export function animatorControllerAssets(project){
 const items=project?.animatorControllers;
 if(!Array.isArray(items))return [];
 const counts=new Map();
 for(const asset of items)if(validId(asset?.id))counts.set(asset.id,(counts.get(asset.id)||0)+1);
 return items.filter(asset=>!validateAnimatorControllerAsset(asset).length&&counts.get(asset.id)===1);
}
export function validateAnimatorControllerAsset(asset){
 if(!asset||!validId(asset.id)||!validName(asset.name))return ['Identifiant ou nom de Controller invalide.'];
 if(!Number.isSafeInteger(asset.revision)||asset.revision<1)return ['Révision de Controller invalide.'];
 try{return inspectAnimatorGraph(asset.graph)}catch{return ['Structure de graphe Animator invalide ou non prise en charge.']}
}
export function restoreAnimatorControllerAssets(value){
 // Loading is lossless, including future formats and invalid entries. Validation
 // controls authoring, never which source data survives the next project save.
 return value===undefined?[]:clone(value);
}
export function animatorControllerDiagnostics(project){
 const items=project?.animatorControllers;
 if(items===undefined)return [];
 if(!Array.isArray(items))return ['Format de bibliothèque non pris en charge : données conservées en lecture seule.'];
 const errors=[],counts=new Map();
 for(const asset of items)if(validId(asset?.id))counts.set(asset.id,(counts.get(asset.id)||0)+1);
 if(items.length>animatorAssetLimit)errors.push(items.length+' ressources conservées ; création limitée à '+animatorAssetLimit+' Controllers.');
 items.forEach((asset,index)=>{
  const issues=validateAnimatorControllerAsset(asset);
  if(validId(asset?.id)&&counts.get(asset.id)>1)issues.push('Identifiant dupliqué.');
  if(issues.length)errors.push('Ressource '+(index+1)+' : '+issues.join(' ')+' Données conservées en lecture seule.');
 });
 return errors;
}
export function createAnimatorControllerAsset(project,object,{name=null}={}){
 if(!project||!object?.animatorGraph||!validName(name??object.name+' Controller'))throw Error('Sélectionne un GameObject avec un Animator valide.');
 const errors=inspectAnimatorGraph(object.animatorGraph);
 if(errors.length)throw Error('Animator invalide : '+errors.slice(0,3).join('; '));
 if(project.animatorControllers!==undefined&&!Array.isArray(project.animatorControllers))throw Error('Bibliothèque non prise en charge : données conservées en lecture seule.');
 const items=project.animatorControllers||[];
 if(items.length>=animatorAssetLimit)throw Error('64 Animator Controllers maximum par espace de projet.');
 const id='anim-'+Date.now().toString(36)+'-'+Math.floor(Math.random()*1679616).toString(36);
 const asset={id,name:(name??object.name+' Controller').trim(),revision:1,graph:clone(object.animatorGraph)};
 project.animatorControllers??=[];project.animatorControllers.push(asset);
 object.animatorControllerId=id;object.animatorControllerRevision=1;
 return asset;
}
export function assignAnimatorControllerAsset(project,object,id,{replace=true}={}){
 const asset=animatorControllerAssets(project).find(a=>a.id===id);
 if(!asset)throw Error('Animator Controller introuvable dans ce projet.');
 const errors=validateAnimatorControllerAsset(asset);
 if(errors.length)throw Error('Controller invalide : '+errors.join('; '));
 if(object.animatorGraph&&!replace)throw Error('Confirme le remplacement du graphe actuel.');
 // Do not overwrite animationRig, Avatar, clips, meshes, controls or materials.
 object.animatorGraph=clone(asset.graph);
 object.animatorControllerId=asset.id;
 object.animatorControllerRevision=asset.revision;
 return asset;
}
export function saveAnimatorControllerAsset(project,object,{id=object?.animatorControllerId}={}){
 const asset=animatorControllerAssets(project).find(a=>a.id===id);
 if(!asset)throw Error('Aucun Controller réutilisable associé au GameObject.');
 const errors=inspectAnimatorGraph(object?.animatorGraph);
 if(errors.length)throw Error('Graphe invalide : '+errors.slice(0,3).join('; '));
 // Explicit save, never a silent write from Inspector or Play.
 asset.graph=clone(object.animatorGraph);
 asset.revision+=1;
 object.animatorControllerId=asset.id;
 object.animatorControllerRevision=asset.revision;
 return asset;
}
export function removeAnimatorControllerAsset(project,id){
 if(!animatorControllerAssets(project).some(a=>a.id===id))return false;
 const items=project.animatorControllers,index=items.findIndex(a=>a.id===id);
 if(index<0)return false;
 // Copies on GameObjects are kept to preserve their exact gameplay.
 items.splice(index,1);return true;
}
export function animatorControllerOutdated(project,object){
 if(!object?.animatorControllerId)return false;
 const asset=animatorControllerAssets(project).find(a=>a.id===object.animatorControllerId);
 return !asset||asset.revision!==object.animatorControllerRevision;
}

/**
 * Explicitly refresh a GameObject snapshot from its linked project asset.
 * Never modify Avatar, imported clips, IK, root motion or other GameObjects.
 * The caller must confirm overwriting any unsaved local graph edits.
 */
export function synchronizeAnimatorControllerAsset(project,object,{confirmed=false}={}){
 if(!object?.animatorControllerId)throw Error('Ce GameObject ne possède pas de Controller lié.');
 if(!confirmed)throw Error('Confirme le remplacement du graphe local avant synchronisation.');
 return assignAnimatorControllerAsset(project,object,object.animatorControllerId);
}
