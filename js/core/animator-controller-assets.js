// Project-local Animator Controller assets. The runtime retains each object's
// serialized graph snapshot, so Play and standalone Web export are independent
// of editor-only asset storage. No sample animations are synthesized.
import {inspectAnimatorGraph} from './animator-graph.js';
const clone=value=>structuredClone(value);
const validName=value=>typeof value==='string'&&value.trim().length>0&&value.trim().length<=120;
const validId=value=>typeof value==='string'&&/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/.test(value);
export const animatorAssetLimit=64;
export function animatorControllerAssets(project){
 return Array.isArray(project?.animatorControllers)?project.animatorControllers:[];
}
export function validateAnimatorControllerAsset(asset){
 if(!asset||!validId(asset.id)||!validName(asset.name))return ['Identifiant ou nom de Controller invalide.'];
 if(!Number.isSafeInteger(asset.revision)||asset.revision<1)return ['Révision de Controller invalide.'];
 return inspectAnimatorGraph(asset.graph);
}
export function restoreAnimatorControllerAssets(value){
 if(!Array.isArray(value))return [];
 const items=[],ids=new Set();
 for(const original of value.slice(0,animatorAssetLimit)){
  try{
   const asset={id:original?.id,name:original?.name,revision:original?.revision,graph:clone(original?.graph)};
   if(!validateAnimatorControllerAsset(asset).length&&!ids.has(asset.id)){
    ids.add(asset.id);items.push(asset)
   }
  }catch{/* A malformed historic asset never blocks opening its scene. */}
 }
 return items;
}
export function createAnimatorControllerAsset(project,object,{name=null}={}){
 if(!project||!object?.animatorGraph||!validName(name??object.name+' Controller'))throw Error('Sélectionne un GameObject avec un Animator valide.');
 const errors=inspectAnimatorGraph(object.animatorGraph);
 if(errors.length)throw Error('Animator invalide : '+errors.slice(0,3).join('; '));
 const items=animatorControllerAssets(project);
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
 const items=animatorControllerAssets(project),index=items.findIndex(a=>a.id===id);
 if(index<0)return false;
 // Copies on GameObjects are kept to preserve their exact gameplay.
 items.splice(index,1);return true;
}
export function animatorControllerOutdated(project,object){
 if(!object?.animatorControllerId)return false;
 const asset=animatorControllerAssets(project).find(a=>a.id===object.animatorControllerId);
 return !asset||asset.revision!==object.animatorControllerRevision;
}
