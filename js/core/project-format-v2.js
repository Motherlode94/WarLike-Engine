// WarLike V2 portable project manifest: scenes and asset references remain separate.
import {validateScene} from './scene-graph-v2.js';
export function createProject(name='Nouveau projet',mode='3d'){
 if(!['2d','3d'].includes(mode))throw Error('Mode inconnu');
 return {schema:'warlike.project.v2',name,mode,scenes:[],assets:[],settings:{startSceneId:null}};
}
export function attachScene(project,scene){
 const errors=validateScene(scene);
 if(errors.length)throw Error('Scène invalide : '+errors.join('; '));
 if(project.scenes.some(s=>s.id===scene.id))throw Error('Scène déjà présente');
 project.scenes.push(structuredClone(scene));
 if(!project.settings.startSceneId)project.settings.startSceneId=scene.id;
 return scene.id;
}
export function validateProject(project){
 const issues=[];
 if(project?.schema!=='warlike.project.v2'||!['2d','3d'].includes(project.mode)||!Array.isArray(project.scenes)||!Array.isArray(project.assets))return ['Projet V2 invalide'];
 const ids=new Set();
 for(const scene of project.scenes){
  if(ids.has(scene.id))issues.push('Identifiant de scène dupliqué');ids.add(scene.id);
  issues.push(...validateScene(scene).map(e=>scene.id+': '+e));
 }
 if(project.settings?.startSceneId&&!ids.has(project.settings.startSceneId))issues.push('Scène initiale absente');
 const assetIds=new Set();
 for(const asset of project.assets){if(typeof asset?.id!=='string'||assetIds.has(asset.id))issues.push('Asset ID invalide ou dupliqué');else assetIds.add(asset.id)}
 return issues;
}
export function exportProject(project){
 const errors=validateProject(project);if(errors.length)throw Error(errors.join('; '));
 return JSON.stringify(project,null,2);
}
export function importProject(json){
 const project=JSON.parse(json),errors=validateProject(project);
 if(errors.length)throw Error(errors.join('; '));
 return structuredClone(project);
}
