// WarLike project diagnostics — truthful export readiness check, independent of renderer.
const isFiniteNum=n=>typeof n==='number'&&Number.isFinite(n);
export function inspectProject({entities=[],name='Projet',type='2d',assetLookup=()=>null}={}){
 const issues=[],ids=new Set(),categories={};
 const add=(severity,code,message,entityId=null)=>issues.push({severity,code,message,entityId});
 if(!Array.isArray(entities)){add('error','SCENE_INVALID','La scène ne contient pas une liste d’entités.');entities=[]}
 let players=0,remote=0;
 for(const o of entities){
  if(!o||typeof o!=='object'){add('error','ENTITY_INVALID','Entité non valide.');continue}
  if(o.id===undefined||o.id===null)add('error','ID_MISSING','Identifiant absent.');
  else if(ids.has(o.id))add('error','ID_DUPLICATE','Identifiant en double : '+o.id,o.id);
  else ids.add(o.id);
  if(!isFiniteNum(o.x)||!isFiniteNum(o.y))add('error','POSITION_INVALID','Position incorrecte : '+String(o.name||o.id),o.id);
  if(!isFiniteNum(o.w)||o.w<=0||!isFiniteNum(o.h)||o.h<=0)add('error','DIMENSIONS_INVALID','Dimensions incorrectes : '+String(o.name||o.id),o.id);
  if(type==='3d'&&o.elevation3d!==undefined&&!isFiniteNum(o.elevation3d))add('error','ELEVATION_INVALID','Hauteur 3D incorrecte : '+String(o.name||o.id),o.id);
  if(o.type==='player'||o.playable3d===true||(type==='3d'&&o.type==='character'))players++;
  categories[o.type||'unknown']=(categories[o.type||'unknown']||0)+1;
  const assetId=type==='3d'?(o.model3dId||o.assetId||o.asset3d||o.model3d||o.modelId||o.prefab3d):null;
  if(assetId){
   const asset=assetLookup(assetId);
   if(!asset)add('error','ASSET_MISSING','Ressource 3D inconnue : '+assetId,o.id);
   else if(asset.url&&!asset.file){remote++;add('info','ASSET_REMOTE','Modèle téléchargé à la demande : '+asset.name,o.id)}
  }
 }
 if(!players)add('warning','PLAYER_MISSING','Aucun joueur configuré dans la scène.');
 if(players>1)add('info','MULTIPLE_PLAYERS',players+' acteurs jouables ; vérifier le contrôleur actif.');
 if(type==='3d')add('info','WEBGL_BETA','Le rendu 3D et le pipeline GLB sont expérimentaux.');
 add('info','EXPORT_LIMITED','Le rapport JSON et la scène exportée ne constituent pas un exécutable autonome.');
 const errors=issues.filter(i=>i.severity==='error').length,warnings=issues.filter(i=>i.severity==='warning').length;
 return {schema:'warlike.diagnostics.v1',name:String(name),type,summary:{entities:entities.length,players,remoteAssets:remote,errors,warnings,readyForSceneExport:errors===0,readyForStandaloneBuild:false},categories,issues};
}
export function downloadDiagnostic(report){
 const data=JSON.stringify(report,null,2);
 const blob=new Blob([data],{type:'application/json'});
 const url=URL.createObjectURL(blob);
 try{const link=document.createElement('a');link.href=url;link.download='warlike-project-diagnostic.json';document.body.append(link);link.click();link.remove()}
 finally{setTimeout(()=>URL.revokeObjectURL(url),1000)}
}
