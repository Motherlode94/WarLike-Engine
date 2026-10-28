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
 if(!validEntities(entities))throw Error('La scène active est invalide.');
 const definition=structuredClone(project),scene={id:definition.activeSceneId,name:definition.scenes.find(s=>s.id===definition.activeSceneId)?.name||'Scène principale',entities:structuredClone(entities),camera:structuredClone(camera||{x:0,y:0,zoom:1})};
 const index=definition.scenes.findIndex(s=>s.id===scene.id);if(index<0)definition.scenes.push(scene);else definition.scenes[index]=scene;
 const issues=definition.scenes.flatMap(s=>inspectBlueprintGame(s.entities,{project:definition}).map(i=>({...i,message:s.name+' : '+i.message})));
 for(const s of definition.scenes)for(const o of s.entities)if(mode==='3d'&&(o.model3dId||o.assetId)){
  const id=o.model3dId||o.assetId,asset=get3dAsset(id);
  if(!asset)issues.push({severity:'error',message:'Modèle introuvable : '+id});
  else if(asset.url?.startsWith('blob:')||asset.file)issues.push({severity:'error',message:'Le modèle local '+asset.name+' doit avoir une ressource durable avant l’export Web.'});
 }
 const errors=issues.filter(i=>i.severity==='error');if(errors.length)throw Error(errors.slice(0,5).map(i=>i.message).join('\n'));
 return {format:'warlike.game.v1',mode,project:definition,issues};
}
export function gameBuildHtml(template,data){
 const json=JSON.stringify(data).replace(/</g,'\\u003c'),title=String(data.project.title||'WarLike Game').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let html=template.replace(/<title>[^<]*<\/title>/,()=>'<title>'+title+'</title>').replace(/<script\b[^>]*type="module"[^>]*src="[^"]*js\/editor\.js[^"]*"[^>]*><\/script>/,'<script type="module" src="./js/game-build-player.js"></script>');
 if(!html.includes('src="./js/game-build-player.js"'))throw Error('Le document de démarrage du moteur est incompatible.');
 html=html.replace('</head>',()=>'<script>globalThis.__WARLIKE_BUILD__=true;</script><script type="application/json" id="warlikeGameData">'+json+'</script></head>').replace('<body>','<body class="warlike-game-build">');
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
  else if(value&&typeof value==='object')Object.values(value).forEach(visit);
 };
 visit(data.project);
 return [...models.values()];
}
export function gameRuntimeFiles(files,data){
 const usedModels=new Set();
 for(const asset of gameRuntimeModels(data)){if(asset.url?.startsWith('./assets/free/'))usedModels.add(asset.url.slice(2));for(const texture of asset.textureFiles||[])usedModels.add(texture.replace(/^\.\//,''))}
 return files.filter(name=>!name.startsWith('assets/free/')||!name.includes('/previews/')&&!/\/(models|textures)\.json$/.test(name)&&(!(name.endsWith('.glb')||name.startsWith('assets/free/textures/'))||usedModels.has(name)));
}
export function gameBuildModelCatalog(name,source,data){
 const models=gameRuntimeModels(data);
 if(name==='js/assets/quaternius-game-assets.js')return 'export const quaterniusModels3d='+JSON.stringify(models.filter(a=>a.author==='Quaternius'))+';\n';
 if(name==='js/assets/free-game-assets.js'){
  const start=source.indexOf('export const freeSprites2d=');if(start<0)throw Error('Catalogue 2D incompatible');
  return 'export const freeModels3d='+JSON.stringify(models.filter(a=>a.author==='Kenney'))+';\n'+source.slice(start);
 }
 return source;
}
export async function exportGamePackage(input,{fetcher=fetch,onProgress=()=>{}}={}){
 const data=prepareGameDefinition(input),base=new URL('../../',import.meta.url);
 const get=async path=>{const response=await fetcher(new URL(path,base));if(!response.ok)throw Error('Ressource indisponible : '+path);return response};
 const manifest=await (await get('runtime-files.json')).json();
 if(!Array.isArray(manifest.files)||manifest.files.length>25000||manifest.files.some(p=>typeof p!=='string'||!/^[-A-Za-z0-9._/]+$/.test(p)||p.startsWith('/')||p.includes('..')))throw Error('Manifest du runtime invalide.');
 const files=gameRuntimeFiles(manifest.files,data);
 const entries=new Array(files.length);let cursor=0,completed=0;
 const worker=async()=>{while(cursor<files.length){const i=cursor++,name=files[i];const response=await get(name);entries[i]={name,data:name==='index.html'?gameBuildHtml(await response.text(),data):['js/assets/free-game-assets.js','js/assets/quaternius-game-assets.js'].includes(name)?gameBuildModelCatalog(name,await response.text(),data):await response.arrayBuffer()};onProgress(++completed,files.length)}};
 await Promise.all(Array.from({length:6},worker));
 entries.push({name:'game.json',data:JSON.stringify(data,null,2)},{name:'LIRE-MOI.txt',data:'WARLIKE GAME — '+data.project.title+'\n\nDécompresse cette archive et sers ce dossier via un serveur HTTP statique. Par exemple : python -m http.server 8000, puis http://localhost:8000. Le menu de démarrage est dans index.html.\n\nLe runtime JavaScript et les modèles intégrés utilisés sont inclus. Le module C++ / WASM est livré lorsqu’il est présent dans le moteur. Les modèles GLB distants demandent une connexion Internet et conservent leurs licences propres. Les ressources GLB locales sans lien durable bloquent l’export. Les scripts C#/.NET ne sont pas exécutés par ce build Web.\n\nDéplacements : ZQSD/WASD. E : interaction. Échap : pause. Les sauvegardes restent sur le navigateur.\n'});
 return {blob:createZip(entries),filename:(data.project.title.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9-]+/g,'-').replace(/^-|-$/g,'')||'warlike-game')+'.zip',files:entries.length};
}
