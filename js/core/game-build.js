import {playerModules} from './player-modules.js';
import {MAX_SCENE_MODEL_BYTES} from '../assets/model-capacity.js';
import {portableModelBytes,portableModelDescriptor} from './portable-assets.js';
import {loadProjectHdri} from './project-hdri-assets.js';
import {portableRemoteModelBytes,portableRemoteModelDescriptor} from './portable-remote-models.js';
import {animationEditorPreview} from './animation-clips.js';
import {inspectRuntimeCompatibility} from './runtime-capabilities.js';
import {canonicalScene} from './scene-contract.js';
import {survivalTools} from './survival-tools.js';
import {resolveGameGenre,genreCompatible} from './game-genres.js';
import {gameProject,validEntities} from './game-project.js';
import {inspectBlueprintGame} from './blueprint-validation.js';
import {get3dAsset,prefab3d} from '../assets/catalog-3d.js';
const encoder=new TextEncoder();
const crcTable=Array.from({length:256},(_,i)=>{let c=i;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;return c>>>0});
export function crc32(bytes){let c=0xffffffff;for(const byte of bytes)c=crcTable[(c^byte)&255]^(c>>>8);return (c^0xffffffff)>>>0}
export function createZip(entries){
 const local=[],central=[];let offset=0;
 const header=size=>{const bytes=new Uint8Array(size);return {bytes,view:new DataView(bytes.buffer)}};
 for(const entry of entries){
  if(!entry.name||entry.name.startsWith('/')||entry.name.split('/').includes('..'))throw Error('Chemin de fichier invalide.');
  const name=encoder.encode(entry.name),data=typeof entry.data==='string'?encoder.encode(entry.data):new Uint8Array(entry.data),crc=crc32(data);
  const a=header(30+name.length);a.view.setUint32(0,0x04034b50,true);a.view.setUint16(4,20,true);a.view.setUint16(6,0x800,true);a.view.setUint32(14,crc,true);a.view.setUint32(18,data.length,true);a.view.setUint32(22,data.length,true);a.view.setUint16(26,name.length,true);a.bytes.set(name,30);local.push(a.bytes,data);
  const b=header(46+name.length);b.view.setUint32(0,0x02014b50,true);b.view.setUint16(4,20,true);b.view.setUint16(6,20,true);b.view.setUint16(8,0x800,true);b.view.setUint32(16,crc,true);b.view.setUint32(20,data.length,true);b.view.setUint32(24,data.length,true);b.view.setUint16(28,name.length,true);b.view.setUint32(42,offset,true);b.bytes.set(name,46);central.push(b.bytes);offset+=a.bytes.length+data.length;
 }
 const size=central.reduce((n,a)=>n+a.length,0),end=header(22);end.view.setUint32(0,0x06054b50,true);end.view.setUint16(8,entries.length,true);end.view.setUint16(10,entries.length,true);end.view.setUint32(12,size,true);end.view.setUint32(16,offset,true);
 return new Blob([...local,...central,end.bytes],{type:'application/zip'});
}
export function prepareGameDefinition({entities,camera,mode='2d',project=gameProject}){
 if(entities?.includes(animationEditorPreview.owner))animationEditorPreview.stop();
 if(!['2d','3d'].includes(mode))throw Error('Type de projet invalide.');
 if(!validEntities(entities))throw Error('La scène active est invalide.');
 const definition=structuredClone(project),scene={id:definition.activeSceneId,name:definition.scenes.find(s=>s.id===definition.activeSceneId)?.name||'Scène principale',entities:structuredClone(entities),camera:structuredClone(camera||{x:0,y:0,zoom:1})};
 definition.genre=resolveGameGenre(definition.genre,entities);if(!genreCompatible(definition.genre,mode))throw Error('Le type de jeu '+definition.genre+' est incompatible avec le projet '+mode.toUpperCase()+'.');
 const index=definition.scenes.findIndex(s=>s.id===scene.id);if(index<0)definition.scenes.push(scene);else definition.scenes[index]=scene;
 // Some legacy projects moved/renamed their only scene without updating the
 // startup ID. Repair only the exported clone when the choice is unambiguous.
 // Never rewrite the source project or guess among multiple scenes.
 const exportWarnings=[];
 if(!definition.scenes.some(s=>s.id===definition.startupSceneId)){
  if(definition.scenes.length===1){
   const previous=definition.startupSceneId;
   definition.startupSceneId=definition.scenes[0].id;
   exportWarnings.push({severity:'warning',message:'Scène de démarrage « '+previous+' » absente : export de l’unique scène « '+definition.startupSceneId+' ». Le projet enregistré reste inchangé.'});
  }else{
   throw Error('Scène de démarrage « '+definition.startupSceneId+' » absente. Choisis explicitement la scène à lancer parmi '+definition.scenes.map(s=>s.id).join(', ')+'.');
  }
 }
 const issues=[...exportWarnings,...definition.scenes.flatMap(s=>[...inspectBlueprintGame(s.entities,{project:definition}),...inspectRuntimeCompatibility(s.entities,{target:'web',backend:definition.runtimeBackend,project:definition})].map(i=>({...i,message:s.name+' : '+i.message})))];
 for(const s of definition.scenes)for(const o of s.entities)if(mode==='3d'&&(o.model3dId||o.assetId)){
  const id=o.model3dId||o.assetId,asset=get3dAsset(id);
  if(!asset)issues.push({severity:'error',message:'Modèle introuvable : '+id});
  else if(asset.url?.startsWith('blob:')&&!asset.file)issues.push({severity:'error',message:'Le modèle local '+asset.name+' doit avoir une ressource durable avant l’export Web.'});
 }
 const errors=issues.filter(i=>i.severity==='error');if(errors.length)throw Error(errors.slice(0,5).map(i=>i.message).join('\n'));
 return {format:'warlike.game.v1',mode,project:definition,sceneContracts:definition.scenes.map(s=>canonicalScene(s.entities,{id:s.id,name:s.name})),runtime:{version:1,backend:'web',nativeScripts:false,warScript:1},issues};
}
export function gameBuildHtml(template,data){
 const json=JSON.stringify(data).replace(/</g,'\\u003c'),title=String(data.project.title||'WarLike Game').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const styles=['style','studio-polish','blueprint-hub','adventure','survival','project-genres','company','life','creative-studios','runtime-player','runtime-profiler'];
 const html='<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+title+'</title><script type="importmap">{"imports":{"@dimforge/rapier3d-compat":"./vendor/rapier3d/rapier.mjs"}}</script>'+styles.map(name=>'<link rel="stylesheet" href="./css/'+name+'.css">').join('')+'<script>globalThis.__WARLIKE_BUILD__=true;'+(data.hasEnvironmentHdri?'globalThis.__WARLIKE_HDRI_INCLUDED__=true;':'')+'</script><script type="application/json" id="warlikeGameData">'+json+'</script></head><body class="warlike-game-build"><main id="viewport"><canvas id="canvas"></canvas><canvas id="canvas3d" hidden></canvas><div id="view3dStatus" hidden></div><div id="horror3dHud" hidden></div><div id="rpgShortcuts" class="rpg-shortcuts" hidden></div><section id="rpgInventory" class="rpg-overlay" hidden></section><section id="rpgJournal" class="rpg-overlay" hidden></section><section id="rpgDialogue" class="rpg-dialogue" hidden></section></main><script type="module" src="./js/game-build-player.js"></script></body></html>';

 return html;
}
// The editor ships the complete library. A playable export only needs models
// referenced by its scenes, prefabs and Blueprint instructions, plus the shared
// runtime resources. Do not fetch thousands of unused meshes and thumbnails.
export function gameRuntimeModels(data){
 const models=new Map();
 const visit=value=>{
  if(typeof value==='string'){
   const asset=get3dAsset(value);
   if(asset?.shape==='glb')models.set(asset.id,asset);
   else if(asset){const model=get3dAsset(prefab3d(value)?.model3dId);if(model?.shape==='glb')models.set(model.id,model)}
  }else if(Array.isArray(value))value.forEach(visit);
  else if(value&&typeof value==='object'){if(value.survival)for(const tool of Object.values(survivalTools))visit(tool.modelId);Object.values(value).forEach(visit)}
 };
 visit(data.project);
 return [...models.values()];
}
export function gameRuntimeFiles(files,data){
 const usedModels=new Set(),toolPreviews=new Set(),toolIds=new Set(Object.values(survivalTools).map(tool=>tool.modelId));
 for(const asset of gameRuntimeModels(data)){if(toolIds.has(asset.id)&&asset.thumbnailUrl?.startsWith('./assets/free/'))toolPreviews.add(asset.thumbnailUrl.slice(2));if(asset.url?.startsWith('./assets/free/'))usedModels.add(asset.url.slice(2));for(const texture of asset.textureFiles||[])usedModels.add(texture.replace(/^\.\//,''))}
 const modules=new Set(playerModules),styles=new Set(['style','studio-polish','blueprint-hub','adventure','survival','project-genres','company','life','creative-studios','runtime-player','runtime-profiler'].map(n=>'css/'+n+'.css'));
 return files.filter(name=>{
  if(/\.m?js$/.test(name)&&!modules.has(name))return false;
  if(name.endsWith('.html')&&name!=='index.html')return false;
  if(name.startsWith('css/')&&!styles.has(name))return false;
  return toolPreviews.has(name)||!name.startsWith('assets/free/')||!name.includes('/previews/')&&!/\/(models|textures)\.json$/.test(name)&&(!(name.endsWith('.glb')||name.startsWith('assets/free/textures/'))||usedModels.has(name));
 });
}
export function gameBuildModelCatalog(name,source,data){
 const replacements=new Map((data.packagedRemoteModels||[]).map(model=>[model.id,model]));
 const models=gameRuntimeModels(data).map(model=>replacements.get(model.id)||model);
 if(name==='js/assets/kaykit-game-assets.js')return 'export const kaykitModels3d='+JSON.stringify(models.filter(a=>a.author==='KayKit'))+';\n';
 if(name==='js/assets/quaternius-game-assets.js')return 'export const quaterniusModels3d='+JSON.stringify(models.filter(a=>a.author==='Quaternius'))+';\n';
 if(name==='js/assets/free-game-assets.js'){
  const start=source.indexOf('export const freeSprites2d=');if(start<0)throw Error('Catalogue 2D incompatible');
  return 'export const freeModels3d='+JSON.stringify(models.filter(a=>a.author==='Kenney'))+';\n'+source.slice(start);
 }
 return source;
}
export async function exportGamePackage(input,{fetcher=fetch,onProgress=()=>{}}={}){
 const data=prepareGameDefinition(input),base=new URL('../../',import.meta.url);
 const hdri=await loadProjectHdri(data.project?.id);
 data.hasEnvironmentHdri=!!hdri;
 const get=async path=>{const response=await fetcher(new URL(path,base));if(!response.ok)throw Error('Ressource indisponible : '+path);return response};
 const manifest=await (await get('runtime-files.json')).json();
 if(!Array.isArray(manifest.files)||manifest.files.length>25000||manifest.files.some(p=>typeof p!=='string'||!/^[-A-Za-z0-9._/]+$/.test(p)||p.startsWith('/')||p.includes('..')))throw Error('Manifest du runtime invalide.');
 const referenced=gameRuntimeModels(data);
 const models=referenced.filter(asset=>asset.file);
 const remote=referenced.filter(asset=>!asset.file&&/^https:\/\//i.test(asset.url||''));
 const importedEntries=[];let importedBytes=0;
 const localDescriptors=[];
 for(const asset of models){
  const bytes=await portableModelBytes(asset);
  importedBytes+=bytes.length;if(importedBytes>MAX_SCENE_MODEL_BYTES)throw Error('Assets importés supérieurs à 256 Mo.');
  const descriptor=portableModelDescriptor(asset);
  localDescriptors.push(descriptor);
  importedEntries.push({name:descriptor.url.slice(2),data:bytes});
 }
 const remoteDescriptors=[];
 for(const asset of remote){
  const {descriptor,bytes}=await portableRemoteModelBytes(asset,{fetcher});
  importedBytes+=bytes.length;if(importedBytes>MAX_SCENE_MODEL_BYTES)throw Error('GLB et textures exportés supérieurs à 100 Mo.');
  remoteDescriptors.push(descriptor);
  importedEntries.push({name:descriptor.url.slice(2),data:bytes});
 }
 data.importedModels=localDescriptors;
 data.packagedRemoteModels=remoteDescriptors;
 const importedCatalog='export const packagedModels3d='+JSON.stringify([...localDescriptors,...remoteDescriptors])+';\n';
 // Include both local design-system stylesheets in every standalone package.
 const sharedStyles=['design-system/warlike-foundation.css','design-system/warlike-shell.css'];
 const files=gameRuntimeFiles([...new Set([...manifest.files,...sharedStyles])],data);
 const entries=new Array(files.length);let cursor=0,completed=0;
 const worker=async()=>{while(cursor<files.length){const i=cursor++,name=files[i];const response=await get(name);entries[i]={name,data:name==='js/assets/imported-models-3d.js'?importedCatalog:name==='index.html'?gameBuildHtml(await response.text(),data):['js/assets/free-game-assets.js','js/assets/quaternius-game-assets.js','js/assets/kaykit-game-assets.js'].includes(name)?gameBuildModelCatalog(name,await response.text(),data):await response.arrayBuffer()};onProgress(++completed,files.length)}};
 await Promise.all(Array.from({length:6},worker));
 // Ship HDRI bytes with the portable game, so post-export rendering stays offline.
 if(hdri)importedEntries.push({name:'assets/environment.hdr',data:hdri.bytes});
 entries.push(...importedEntries);
 if(!files.includes('js/assets/imported-models-3d.js'))entries.push({name:'js/assets/imported-models-3d.js',data:importedCatalog});
 entries.push({name:'game.json',data:JSON.stringify(data,null,2)},{name:'LIRE-MOI.txt',data:'WARLIKE GAME — '+data.project.title+'\n\nDécompresse cette archive et sers ce dossier via un serveur HTTP statique. Par exemple : python -m http.server 8000, puis http://localhost:8000. Le menu de démarrage est dans index.html.\n\nLe runtime JavaScript et les modèles intégrés utilisés sont inclus. Le module C++ / WASM est livré lorsqu’il est présent dans le moteur. Les modèles GLB distants utilisés dans le jeu sont intégrés dans assets/remote avec leurs textures externes PNG/JPEG/WebP pour un jeu hors ligne. Les GLB importés et leurs textures intégrées sont inclus dans assets/imported. Les licences d’origine restent applicables. Les scripts C#/.NET ne sont pas exécutés par ce build Web.\n\nDéplacements : ZQSD/WASD. E : interaction. Échap : pause. Les sauvegardes restent sur le navigateur.\n\nCOOP LOCALE (2 à 4 joueurs)\nPython 3.10+ est nécessaire sur le PC hôte. Lance start-warlike-multi.cmd sous Windows, ou python3 python/warlike.py multiplayer. Garde le terminal ouvert. Ouvre l’adresse locale affichée, puis Coop locale > Héberger avec la clé du terminal. Les invités ouvrent l’adresse réseau affichée sur leur PC et rejoignent avec le code du salon. L’hôte simule le jeu dans son navigateur et gère pause, sauvegardes et escouades. Le serveur Python relaie les commandes et les états, sans compte ni service extérieur. 256 objets maximum ; les ressources doivent être incluses dans le même export.\n'});
 return {blob:createZip(entries),filename:(data.project.title.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9-]+/g,'-').replace(/^-|-$/g,'')||'warlike-game')+'.zip',files:entries.length};
}
