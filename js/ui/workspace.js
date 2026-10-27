import {readPrefabs,savePrefab,instantiatePrefab,applyPrefabChanges,updatePrefab} from '../core/prefab-library.js';
import {persistLocalModel,restoreLocalModels,clearLocalModels} from '../core/local-asset-library.js';
import {addCommunityModels3d} from '../assets/community-models-3d.js';
import {free3dLibraries} from '../assets/free-3d-libraries.js';
import {assignModelThumbnail} from './real-model-thumbnail.js';
import {registerLocalModel,registerRemoteModel,realModels3d} from '../assets/real-models-3d.js';
import {view3d,sceneCamera3d,groundHit3d} from '../core/viewport-3d.js';
import {workspace} from '../core/workspaces.js';
import {assets3d,allAssets3d,categories3d,url3d,get3dAsset,prefab3d} from '../assets/catalog-3d.js';
import {record} from '../core/history.js';
import {genreKeywords} from '../assets/genre-essentials.js';
import {state,notify} from '../core/state.js';
import {catalog,urlFor,categories} from '../assets/catalog.js';
import {addPrefab} from '../core/scene.js';
export const toolsState={tool:'move',snap:false,grid:true,colliders:false};
const $=s=>document.querySelector(s);
export function setTool(id){if(!['hand','move','rotate','scale','rect'].includes(id))return;toolsState.tool=id;document.querySelectorAll('[data-tool]').forEach(b=>b.classList.toggle('active',b.dataset.tool===id));$('#toolStatus').textContent=id[0].toUpperCase()+id.slice(1)+' tool';log('Outil : '+id)}
let lines=[];
export function log(message,level='info'){lines.push({message,time:new Date().toLocaleTimeString(),level});if(lines.length>160)lines.shift();drawLogs()}
function drawLogs(){const root=$('#consoleEntries');if(!root)return;root.replaceChildren();const filters={info:$('#showInfo')?.checked,warn:$('#showWarn')?.checked,error:$('#showError')?.checked};for(const entry of lines.filter(x=>filters[x.level])){const div=document.createElement('div');div.className='console-line '+entry.level;div.textContent='['+entry.time+'] '+entry.message;root.append(div)}$('#consoleCount').textContent=lines.filter(x=>x.level==='error').length||lines.length}
export function initWorkspace(){
document.querySelectorAll('[data-tool]').forEach(b=>b.onclick=()=>setTool(b.dataset.tool));
$('#snapEnabled').onchange=e=>{toolsState.snap=e.target.checked;log('Snap '+(toolsState.snap?'activé':'désactivé'))};
$('#gridEnabled').onchange=e=>{toolsState.grid=e.target.checked};
$('#colliderVisible').onchange=e=>{toolsState.colliders=e.target.checked};
$('#hierarchySearch').oninput=notify;
const project=$('#projectContent'),consolePanel=$('#consoleContent');
function tab(which){project.hidden=which!=='project';consolePanel.hidden=which!=='console';$('#projectTab').classList.toggle('active',which==='project');$('#consoleTab').classList.toggle('active',which==='console')}
$('#projectTab').onclick=()=>tab('project');$('#consoleTab').onclick=()=>tab('console');$('#consoleClear').onclick=()=>{lines=[];drawLogs()};
['showInfo','showWarn','showError'].forEach(id=>$('#'+id).onchange=drawLogs);
window.addEventListener('error',e=>log(e.message,'error'));window.addEventListener('unhandledrejection',e=>log(String(e.reason),'error'));
const tree=$('#assetFolders'),select=$('#assetCategory'),search=$('#assetSearch'),grid=$('#assetGrid'),sort=$('#assetSort'),size=$('#assetSize'),preview=$('#assetPreview');
const lazyGlbObserver=typeof IntersectionObserver==='function'?new IntersectionObserver(entries=>{
 for(const entry of entries)if(entry.isIntersecting){
  lazyGlbObserver.unobserve(entry.target);
  if(entry.target.isConnected)assignModelThumbnail(entry.target,entry.target.dataset.glbId);
 }
},{root:grid,rootMargin:'180px'}):null;

let selectedAsset=null,view=localStorage.getItem('warlike.assetView')==='list'?'list':'grid';
const storedSize=Number(localStorage.getItem('warlike.assetSize'));if(storedSize>=90&&storedSize<=180)size.value=String(storedSize);
function selectFolder(cat){select.value=cat;selectedAsset=null;render()}
function add3d(id,x,y){
 const obj=prefab3d(id,state.nextId++,x??120+(state.nextId%8)*60,y??120+(state.nextId%5)*60);
 if(!obj)return;
 state.entities.push(obj);state.selected=[obj.id];record('Ajouter mesh 3D '+obj.name);notify();
}

const prefabTools=document.createElement('div');prefabTools.className='asset-folder-import';
const prefabTitle=document.createElement('strong');prefabTitle.textContent='◇ Mes prefabs réutilisables';
const prefabSelect=document.createElement('select');prefabSelect.setAttribute('aria-label','Prefabs enregistrés');
const prefabSave=document.createElement('button');prefabSave.type='button';prefabSave.textContent='Créer depuis la sélection';
const prefabAdd=document.createElement('button');prefabAdd.type='button';prefabAdd.textContent='Instancier dans la scène';
const prefabApply=document.createElement('button');prefabApply.type='button';prefabApply.textContent='Appliquer les modifications';
const prefabInfo=document.createElement('small');prefabInfo.textContent='Modèles de scène réutilisables conservés dans le navigateur.';
const refreshPrefabList=()=>{const previous=prefabSelect.value;prefabSelect.replaceChildren(...readPrefabs().map(p=>{const o=document.createElement('option');o.value=p.id;o.textContent=p.name;return o}));if(readPrefabs().some(p=>p.id===previous))prefabSelect.value=previous};
prefabSave.onclick=()=>{if(state.playing)return;const entity=state.entities.find(o=>o.id===state.selected.at(-1));if(!entity){prefabInfo.textContent='Sélectionne un objet avant de créer un prefab.';return}try{const p=savePrefab(entity);refreshPrefabList();prefabSelect.value=p.id;prefabInfo.textContent='Prefab créé : '+p.name}catch(error){prefabInfo.textContent=error.message}};
prefabAdd.onclick=()=>{if(state.playing)return;const p=readPrefabs().find(p=>p.id===prefabSelect.value);if(!p)return;const object=instantiatePrefab(p,state.nextId++,120+(state.nextId%7)*40,120+(state.nextId%5)*40);state.entities.push(object);state.selected=[object.id];record('Instancier prefab '+p.name);notify()};
prefabApply.onclick=()=>{if(state.playing)return;const entity=state.entities.find(o=>o.id===state.selected.at(-1));const p=readPrefabs().find(p=>p.id===entity?.prefabSourceId);if(!p){prefabInfo.textContent='Sélectionne une instance de prefab.';return}try{const result=applyPrefabChanges(p,entity,state.entities);updatePrefab(result.prefab);state.entities=result.instances;record('Appliquer prefab '+p.name);notify();prefabInfo.textContent='Modifications appliquées aux instances liées.'}catch(error){prefabInfo.textContent=error.message}};
prefabTools.append(prefabTitle,prefabSelect,prefabSave,prefabAdd,prefabApply,prefabInfo);
document.querySelector('.asset-content')?.prepend(prefabTools);
refreshPrefabList();
const genuineFilter=document.createElement('label');genuineFilter.className='genuine-model-filter';
const genuineToggle=document.createElement('input');genuineToggle.type='checkbox';
genuineToggle.checked=localStorage.getItem('warlike.onlyReal3d')!=='false';
const genuineText=document.createElement('span');genuineText.textContent='Afficher uniquement les vrais modèles 3D (GLB)';
genuineFilter.append(genuineToggle,genuineText);
document.querySelector('.asset-toolbar')?.append(genuineFilter);
genuineToggle.onchange=()=>{localStorage.setItem('warlike.onlyReal3d',String(genuineToggle.checked));selectedAsset=null;render()};
const import3dPanel=document.createElement('div');import3dPanel.className='real-model-import';
const rapierOption=document.createElement('label');rapierOption.className='rapier-toggle';
const rapierCheckbox=document.createElement('input');rapierCheckbox.type='checkbox';rapierCheckbox.checked=localStorage.getItem('warlike.rapier3d')==='enabled';
const rapierText=document.createElement('span');rapierText.textContent='⚙ Physique Rapier 3D (WASM) — expérimentale, appliquée au prochain Play';
rapierCheckbox.onchange=()=>{localStorage.setItem('warlike.rapier3d',rapierCheckbox.checked?'enabled':'disabled');log('Physique 3D : '+(rapierCheckbox.checked?'Rapier demandé au prochain Play':'moteur interne'))};
rapierOption.append(rapierCheckbox,rapierText);import3dPanel.append(rapierOption);
const label3d=document.createElement('label');label3d.textContent='Importer un modèle GLB (personnage, arme, véhicule…)';
const import3d=document.createElement('input');import3d.type='file';import3d.accept='.glb,model/gltf-binary';import3d.setAttribute('aria-label','Importer modèle 3D GLB');
import3d.onchange=async()=>{try{const file=import3d.files?.[0];if(!file)return;const model=registerLocalModel(file);const cat=prompt('Catégorie du modèle : Characters, Weapons, Vehicles ou Props','Weapons');if(['Characters','Weapons','Vehicles','Props'].includes(cat))model.category=cat;await persistLocalModel(model);render();log('GLB importé dans la bibliothèque de cette session : '+model.name);document.dispatchEvent(new Event('warlike:workspace'))}catch(error){alert(error.message)}finally{import3d.value=''}};
label3d.append(import3d);import3dPanel.append(label3d);
// Import a local folder of existing GLB models; browsers cannot read arbitrary disk paths.
const folderPanel=document.createElement('div');folderPanel.className='asset-folder-import';
const folderInput=document.createElement('input');folderInput.type='file';folderInput.multiple=true;folderInput.setAttribute('webkitdirectory','');folderInput.setAttribute('directory','');folderInput.accept='.glb,.fbx,.gltf';
folderInput.setAttribute('aria-label','Choisir le dossier de mes assets 3D');
const folderTitle=document.createElement('strong');folderTitle.textContent='📁 Mes assets 3D — importer un dossier';
const folderStatus=document.createElement('small');folderStatus.textContent='Choisis un dossier sur ton PC. GLB pris en charge ; FBX à convertir en GLB.';
const classifyLocal=(path)=>{
 const value=path.toLowerCase();
 if(/weapon|armes?|rifle|pistol|shotgun|sword|knife|gun|fusil|katana|bow/.test(value))return 'Weapons';
 if(/vehicle|vehicule|voiture|truck|car|tank|helicopter|bus|motor|bike/.test(value))return 'Vehicles';
 if(/character|personnage|soldier|human|zombie|enemy|npc|robot/.test(value))return 'Characters';
 if(/building|batiment|house|garage|hangar|architecture/.test(value))return 'Buildings';
 if(/nature|tree|rock|plant|grass/.test(value))return 'Nature';
 return 'Imported 3D';
};
folderInput.onchange=async()=>{
 const files=Array.from(folderInput.files||[]),glbs=files.filter(file=>/\.glb$/i.test(file.name));
 const fbxs=files.filter(file=>/\.fbx$/i.test(file.name)),gltfs=files.filter(file=>/\.gltf$/i.test(file.name));
 let imported=0,rejected=0;
 folderInput.disabled=true;folderStatus.textContent='Import des modèles GLB en cours…';
 try{
  for(const file of glbs){
   try{
    if(file.size>25*1024*1024)throw Error('trop volumineux');
    const header=new DataView(await file.slice(0,12).arrayBuffer());
    if(header.byteLength<12||header.getUint32(0,true)!==0x46546c67||header.getUint32(4,true)!==2)throw Error('GLB 2.0 invalide');
    const asset=registerLocalModel(file);
    asset.category=classifyLocal(file.webkitRelativePath||file.name);
    asset.sourcePath=file.webkitRelativePath||file.name;
    await persistLocalModel(asset);
    imported++;
   }catch(error){rejected++;log('Asset ignoré '+file.name+' : '+String(error?.message||error),'warn')}
  }
  document.dispatchEvent(new Event('warlike:workspace'));
  folderStatus.textContent=imported+' GLB importés · '+rejected+' refusés · '+fbxs.length+' FBX et '+gltfs.length+' glTF texte à convertir.';
  log('Dossier local : '+folderStatus.textContent);
 }finally{folderInput.disabled=false;folderInput.value=''}
};
folderPanel.append(folderTitle,folderInput,folderStatus);
import3dPanel.append(folderPanel);
const localTools=document.createElement('div');localTools.className='asset-local-tools';
const clearSaved=document.createElement('button');clearSaved.type='button';clearSaved.textContent='Supprimer mes GLB enregistrés';
clearSaved.onclick=async()=>{if(!confirm('Supprimer les fichiers GLB enregistrés dans ce navigateur ?'))return;try{await clearLocalModels();document.dispatchEvent(new Event('warlike:workspace'));folderStatus.textContent='Bibliothèque locale effacée.'}catch(error){folderStatus.textContent='Erreur : '+error.message}};
localTools.append(clearSaved);import3dPanel.append(localTools);
restoreLocalModels().then(count=>{if(count){log(count+' modèles GLB locaux restaurés');document.dispatchEvent(new Event('warlike:workspace'))}}).catch(error=>log('Bibliothèque locale : '+error.message,'warn'));
const remoteForm=document.createElement('form');remoteForm.className='external-glb-form';
const remoteInput=document.createElement('input');remoteInput.type='url';remoteInput.placeholder='https://exemple.org/personnage.glb';remoteInput.required=true;remoteInput.setAttribute('aria-label','URL HTTPS directe du modèle GLB');
const categoryInput=document.createElement('select');categoryInput.setAttribute('aria-label','Catégorie de modèle externe');
for(const name of ['Characters','Monsters','Vehicles','Weapons','Props','Buildings','Imported 3D']){const option=document.createElement('option');option.value=name;option.textContent=name;categoryInput.append(option)}
const remoteSubmit=document.createElement('button');remoteSubmit.type='submit';remoteSubmit.textContent='↓ Importer URL GLB';
const remoteHelp=document.createElement('small');remoteHelp.textContent='Lien direct .glb en HTTPS • 25 Mo max • CORS autorisé • licence à vérifier';
remoteForm.append(remoteInput,categoryInput,remoteSubmit,remoteHelp);
remoteForm.onsubmit=async event=>{
 event.preventDefault();remoteSubmit.disabled=true;remoteSubmit.textContent='Téléchargement…';
 try{
  const asset=await registerRemoteModel(remoteInput.value,{category:categoryInput.value});
  remoteInput.value='';render();log('Modèle externe importé : '+asset.name);document.dispatchEvent(new Event('warlike:workspace'));
 }catch(error){log('Import externe : '+(error.message||error),'error');alert('Échec de l’import : '+(error.message||error)+'\\nLe serveur doit autoriser CORS et fournir un fichier GLB valide.')}
 finally{remoteSubmit.disabled=false;remoteSubmit.textContent='↓ Importer URL GLB'}
};
import3dPanel.append(remoteForm);import3dPanel.hidden=workspace.mode!=='3d';tree.parentNode?.querySelector('.asset-content')?.prepend(import3dPanel);
let communityAttempted=false;
const communityImport=document.createElement('div');communityImport.className='real-model-import';
const communityButton=document.createElement('button');communityButton.textContent='＋ Charger jusqu’à 500 modèles 3D CC0';
const communityInfo=document.createElement('small');communityInfo.textContent='Catalogue externe réel : modèles GLB, chargés uniquement lorsque nécessaires. Connexion requise.';
communityImport.append(communityButton,communityInfo);
communityImport.hidden=workspace.mode!=='3d';
tree.parentNode?.querySelector('.asset-content')?.prepend(communityImport);
communityButton.onclick=async()=>{
 communityButton.disabled=true;communityButton.textContent='Récupération du catalogue…';
 try{
  const count=await addCommunityModels3d({limit:500});
  // Refresh categories and asset counts from current catalog data.
  document.dispatchEvent(new Event('warlike:workspace'));
  communityButton.textContent='✓ '+count+' modèles externes indexés';
  const breakdown=allAssets3d().filter(a=>a.collection==='Polygonal Mind CC0').reduce((map,a)=>(map[a.category]=(map[a.category]||0)+1,map),{});
  communityInfo.textContent=Object.entries(breakdown).map(([k,v])=>k+' : '+v).join(' · ')+' · GLB téléchargés à l’utilisation.';
  log(count+' modèles CC0 ajoutés au navigateur 3D');
 }catch(error){
  communityButton.textContent='↻ Réessayer : ajouter 150 modèles 3D';
  communityInfo.textContent='Erreur : '+String(error?.message||error);
  log('Catalogue CC0 : '+error,'error');
 }finally{communityButton.disabled=false}
};
const externalLibrary=document.createElement('details');externalLibrary.className='real-model-import';
const externalTitle=document.createElement('summary');externalTitle.textContent='🌐 Bibliothèques 3D gratuites (sites officiels)';
externalLibrary.append(externalTitle);
const externalNote=document.createElement('p');externalNote.textContent='Choisis un modèle sur le site, télécharge-le légalement, puis importe son fichier .glb ci-dessus. Les formats FBX/OBJ nécessitent une conversion GLB (par exemple via Blender).';externalLibrary.append(externalNote);
for(const site of free3dLibraries){
 const entry=document.createElement('div');entry.style.cssText='padding:7px 0;border-bottom:1px solid #53667855';
 const anchor=document.createElement('a');anchor.href=site.url;anchor.target='_blank';anchor.rel='noopener noreferrer';anchor.textContent=site.name+' ↗';
 const detail=document.createElement('small');detail.style.cssText='display:block;line-height:1.45';detail.textContent=site.focus+' • '+site.license+' • '+site.format;
 entry.append(anchor,detail);externalLibrary.append(entry);
}
externalLibrary.hidden=workspace.mode!=='3d';tree.parentNode?.querySelector('.asset-content')?.prepend(externalLibrary);
document.addEventListener('warlike:workspace',()=>{externalLibrary.hidden=workspace.mode!=='3d';communityImport.hidden=workspace.mode!=='3d';import3dPanel.hidden=workspace.mode!=='3d'});

for(const category of [...new Set([...categories,...categories3d])]){const library=workspace.mode==='3d'?allAssets3d():catalog;const count=category==='All'?library.length:library.filter(a=>a.category===category).length;const btn=document.createElement('button');btn.dataset.folder=category;btn.className='folder-item';const icon=document.createElement('span');icon.className='folder-icon';icon.textContent=category==='All'?'▣':'📁';const title=document.createElement('span');title.textContent=category==='All'?'Assets':category;const counter=document.createElement('small');counter.textContent=count;btn.append(icon,title,counter);btn.onclick=()=>selectFolder(category);tree.append(btn)}
function showPreview(){preview.replaceChildren();if(!selectedAsset){preview.hidden=true;return}const asset=workspace.mode==='3d'?get3dAsset(selectedAsset):catalog.find(a=>a.id===selectedAsset);if(!asset){preview.hidden=true;return}preview.hidden=false;const picture=document.createElement('img');if(workspace.mode==='3d'&&asset.shape==='glb')assignModelThumbnail(picture,asset.id);else picture.src=workspace.mode==='3d'?url3d(asset.id):urlFor(asset.id);picture.alt=asset.name;const info=document.createElement('div');const title=document.createElement('strong');title.textContent=asset.name;const meta=document.createElement('small');meta.textContent=workspace.mode==='3d'?'3D / '+asset.category+' / '+asset.id+' • Mesh '+asset.shape:'2D / '+asset.category+' / '+asset.id+' • '+asset.width+'×'+asset.height+(genreKeywords(asset.id)?' • Genre : '+genreKeywords(asset.id).split(' ').slice(0,2).join(', '):'');const desc=document.createElement('span');desc.textContent=workspace.mode==='3d'?(asset.shape==='glb'?'Véritable mesh GLB • Double-clic pour instancier':'Prototype procédural, pas un mesh réaliste • Double-clic pour instancier'):'Prefab 2D • Double-clic pour instancier';info.append(title,meta,desc);const add=document.createElement('button');add.textContent='＋ Ajouter à la scène';add.disabled=state.playing;add.onclick=()=>{if(workspace.mode==='3d')add3d(asset.id);else addPrefab(asset.id);log('Prefab ajouté : '+asset.name)};const close=document.createElement('button');close.textContent='×';close.title='Fermer aperçu';close.onclick=()=>{selectedAsset=null;render()};if(workspace.mode==='3d'&&asset.shape==='glb'){
 const source=realModels3d.find(m=>m.id===asset.id);
 if(source?.url){
  const download=document.createElement('a');download.href=source.url;download.target='_blank';download.rel='noopener noreferrer';download.textContent='↓ Fichier GLB original';download.title='Ouvrir le téléchargement du véritable modèle GLB';info.append(download);
  const license=document.createElement('small');license.textContent='Licence : '+source.license;info.append(license);
 }
}
preview.append(picture,info,add,close)}
function render(){const query=search.value.trim().toLowerCase(),category=select.value;const library=workspace.mode==='3d'?(genuineToggle.checked?allAssets3d().filter(a=>a.shape==='glb'):allAssets3d()):catalog;genuineFilter.hidden=workspace.mode!=='3d';let found=library.filter(a=>(category==='All'||a.category===category)&&(!query||a.name.toLowerCase().includes(query)||a.id.includes(query)||(workspace.mode==='2d'&&genreKeywords(a.id).includes(query))));if(sort.value==='name')found=found.slice().sort((a,b)=>a.name.localeCompare(b.name));if(sort.value==='category')found=found.slice().sort((a,b)=>a.category.localeCompare(b.category)||a.name.localeCompare(b.name));grid.replaceChildren();grid.classList.toggle('asset-list-mode',view==='list');grid.style.setProperty('--asset-card-size',size.value+'px');$('#assetGridMode').classList.toggle('active',view==='grid');$('#assetListMode').classList.toggle('active',view==='list');for(const a of found){const button=document.createElement('button');button.className='asset';button.classList.toggle('selected',selectedAsset===a.id);button.title=a.category+' / '+a.name+' — double clic : ajouter';button.draggable=true;button.dataset.assetId=a.id;const img=document.createElement('img');if(workspace.mode==='3d'&&a.shape==='glb'&&a.collection==='Polygonal Mind CC0'){img.dataset.glbId=a.id;img.src='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120"><rect width="120" height="120" rx="10" fill="#20394a"/><text x="60" y="60" font-size="13" fill="#a3ebd6" text-anchor="middle">Aperçu 3D…</text></svg>');if(lazyGlbObserver)lazyGlbObserver.observe(img);else assignModelThumbnail(img,a.id);}else if(workspace.mode==='3d'&&a.shape==='glb')assignModelThumbnail(img,a.id);else img.src=workspace.mode==='3d'?url3d(a.id):urlFor(a.id);img.alt='';img.loading='lazy';const label=document.createElement('span');label.className='asset-name';label.textContent=a.name;const secondary=document.createElement('small');secondary.textContent=workspace.mode==='3d'?(a.shape==='glb'?'● GLB réel · ':'◇ Prototype · ')+a.category:a.category;button.append(img,label,secondary);button.onclick=()=>{selectedAsset=a.id;grid.querySelectorAll('.asset').forEach(el=>el.classList.toggle('selected',el.dataset.assetId===a.id));showPreview()};button.ondblclick=()=>{if(state.playing)return;if(workspace.mode==='3d')add3d(a.id);else addPrefab(a.id);log('Prefab ajouté : '+a.name)};button.ondragstart=e=>{e.dataTransfer.setData('application/x-warlike-asset',a.id);e.dataTransfer.effectAllowed='copy'};grid.append(button)}$('#assetCount').textContent=found.length+' / '+library.length+' assets';$('#assetBreadcrumb').textContent='Assets  ›  '+(category==='All'?'All Assets':category);$('#assetFooterText').textContent=found.length+' assets affichés • Glisser vers Scene • Double clic pour instancier';tree.querySelectorAll('button').forEach(b=>b.classList.toggle('active',b.dataset.folder===category));showPreview()}
document.addEventListener('warlike:workspace',()=>{
 import3dPanel.hidden=workspace.mode!=='3d';
 externalLibrary.hidden=workspace.mode!=='3d';
 genuineFilter.hidden=workspace.mode!=='3d';communityImport.hidden=workspace.mode!=='3d';
 const list=workspace.mode==='3d'?['All',...new Set(allAssets3d().map(a=>a.category)),'Weapons']:categories;
 const saved=select.value;
 select.replaceChildren(...list.map(cat=>{const o=document.createElement('option');o.value=cat;o.textContent=cat;return o}));
 select.value=list.includes(saved)?saved:'All';selectedAsset=null;
 for(const category of list){
  if(tree.querySelectorAll('[data-folder]').length&&Array.from(tree.querySelectorAll('[data-folder]')).some(node=>node.dataset.folder===category))continue;
  const btn=document.createElement('button');btn.className='folder-item';btn.dataset.folder=category;
  const icon=document.createElement('span');icon.className='folder-icon';icon.textContent='📁';
  const label=document.createElement('span');label.textContent=category;const counter=document.createElement('small');
  btn.append(icon,label,counter);btn.onclick=()=>selectFolder(category);tree.append(btn);
 }
 for(const b of tree.querySelectorAll('[data-folder]')){const n=b.dataset.folder,catAssets=workspace.mode==='3d'?allAssets3d():catalog;b.hidden=!list.includes(n);b.querySelector('small').textContent=n==='All'?catAssets.length:catAssets.filter(a=>a.category===n).length}
 render();
 if(workspace.mode==='3d'&&!communityAttempted){communityAttempted=true;communityButton.click()}
});
// Apply the correct library immediately on initial load as well as on workspace changes.
document.dispatchEvent(new Event('warlike:workspace'));
search.oninput=render;select.onchange=()=>{selectedAsset=null;render()};sort.onchange=render;
$('#assetGridMode').onclick=()=>{view='grid';localStorage.setItem('warlike.assetView',view);render()};
$('#assetListMode').onclick=()=>{view='list';localStorage.setItem('warlike.assetView',view);render()};
size.oninput=()=>{localStorage.setItem('warlike.assetSize',size.value);grid.style.setProperty('--asset-card-size',size.value+'px')};
const center=document.querySelector('.center-stack'),splitter=$('#projectSplitter');
let dragHeight=null;const applyHeight=h=>{const max=Math.max(190,Math.floor(center.clientHeight*0.5));const value=Math.min(max,Math.max(190,h));center.style.setProperty('--project-height',value+'px');localStorage.setItem('warlike.projectHeight',String(value))};
const storedHeight=Number(localStorage.getItem('warlike.projectHeight'));if(storedHeight>0)applyHeight(storedHeight);
splitter.addEventListener('pointerdown',e=>{if(e.button!==0)return;dragHeight={y:e.clientY,h:document.querySelector('.project-panel').getBoundingClientRect().height};splitter.setPointerCapture(e.pointerId);e.preventDefault()});
splitter.addEventListener('pointermove',e=>{if(dragHeight)applyHeight(dragHeight.h+dragHeight.y-e.clientY)});
splitter.addEventListener('pointerup',()=>dragHeight=null);splitter.addEventListener('pointercancel',()=>dragHeight=null);
splitter.addEventListener('keydown',e=>{if(e.key==='ArrowUp'||e.key==='ArrowDown'){e.preventDefault();applyHeight(document.querySelector('.project-panel').getBoundingClientRect().height+(e.key==='ArrowUp'?30:-30))}});
render();
const canvas=$('#canvas');canvas.addEventListener('dragover',e=>{if(e.dataTransfer.types.includes('application/x-warlike-asset'))e.preventDefault()});canvas.addEventListener('drop',e=>{e.preventDefault();const id=e.dataTransfer.getData('application/x-warlike-asset');if(state.playing)return; if(workspace.mode==='3d'){if(!get3dAsset(id))return;add3d(id);return}if(!catalog.some(a=>a.id===id))return;addPrefab(id);const item=state.entities.find(o=>o.id===state.selected.at(-1));if(item){const rect=canvas.getBoundingClientRect(),p={x:e.clientX-rect.left,y:e.clientY-rect.top};item.x=Math.round((p.x-state.camera.x)/state.camera.zoom-item.w/2);item.y=Math.round((p.y-state.camera.y)/state.camera.zoom-item.h/2);notify()}log('Déposé : '+id)});
const canvas3d=$('#canvas3d');
canvas3d.addEventListener('dragover',e=>{if(workspace.mode==='3d'&&e.dataTransfer.types.includes('application/x-warlike-asset'))e.preventDefault()});
canvas3d.addEventListener('drop',e=>{
 e.preventDefault();
 if(workspace.mode!=='3d'||state.playing)return;
 const id=e.dataTransfer.getData('application/x-warlike-asset');
 if(!get3dAsset(id))return;
 const rect=canvas3d.getBoundingClientRect();
 const cam=sceneCamera3d(view3d.target,view3d.yaw,view3d.pitch,view3d.radius);
 const position=groundHit3d(e.clientX-rect.left,e.clientY-rect.top,cam,rect.width,rect.height);
 add3d(id);
 const obj=state.entities.find(o=>o.id===state.selected.at(-1));
 if(obj&&position){obj.x=Math.round(position[0]*64-obj.w/2);obj.y=Math.round(position[2]*64-obj.h/2);record('Positionner prefab 3D');notify()}
 log('Prefab 3D déposé : '+id);
});
window.addEventListener('keydown',e=>{if(['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName)||e.ctrlKey||e.metaKey||state.playing)return;const map={q:'hand',w:'move',e:'rotate',r:'scale',t:'rect'};if(map[e.key.toLowerCase()])setTool(map[e.key.toLowerCase()])});
log('WarLike Engine editor démarré');}
