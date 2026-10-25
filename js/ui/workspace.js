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
let selectedAsset=null,view=localStorage.getItem('warlike.assetView')==='list'?'list':'grid';
const storedSize=Number(localStorage.getItem('warlike.assetSize'));if(storedSize>=90&&storedSize<=180)size.value=String(storedSize);
function selectFolder(cat){select.value=cat;selectedAsset=null;render()}
function add3d(id,x,y){
 const obj=prefab3d(id,state.nextId++,x??120+(state.nextId%8)*60,y??120+(state.nextId%5)*60);
 if(!obj)return;
 state.entities.push(obj);state.selected=[obj.id];record('Ajouter mesh 3D '+obj.name);notify();
}

const import3dPanel=document.createElement('div');import3dPanel.className='real-model-import';
const label3d=document.createElement('label');label3d.textContent='Importer un modèle GLB (personnage, arme, véhicule…)';
const import3d=document.createElement('input');import3d.type='file';import3d.accept='.glb,model/gltf-binary';import3d.setAttribute('aria-label','Importer modèle 3D GLB');
import3d.onchange=()=>{try{const file=import3d.files?.[0];if(!file)return;const model=registerLocalModel(file);const cat=prompt('Catégorie du modèle : Characters, Weapons, Vehicles ou Props','Weapons');if(['Characters','Weapons','Vehicles','Props'].includes(cat))model.category=cat;render();log('GLB importé dans la bibliothèque de cette session : '+model.name);document.dispatchEvent(new Event('warlike:workspace'))}catch(error){alert(error.message)}finally{import3d.value=''}};
label3d.append(import3d);import3dPanel.append(label3d);
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
document.addEventListener('warlike:workspace',()=>{externalLibrary.hidden=workspace.mode!=='3d';import3dPanel.hidden=workspace.mode!=='3d'});

for(const category of [...new Set([...categories,...categories3d])]){const initial=allAssets3d();const count=category==='All'?catalog.length:catalog.filter(a=>a.category===category).length;const btn=document.createElement('button');btn.dataset.folder=category;btn.className='folder-item';const icon=document.createElement('span');icon.className='folder-icon';icon.textContent=category==='All'?'▣':'📁';const title=document.createElement('span');title.textContent=category==='All'?'Assets':category;const counter=document.createElement('small');counter.textContent=count;btn.append(icon,title,counter);btn.onclick=()=>selectFolder(category);tree.append(btn)}
function showPreview(){preview.replaceChildren();if(!selectedAsset){preview.hidden=true;return}const asset=workspace.mode==='3d'?get3dAsset(selectedAsset):catalog.find(a=>a.id===selectedAsset);if(!asset){preview.hidden=true;return}preview.hidden=false;const picture=document.createElement('img');if(workspace.mode==='3d'&&asset.shape==='glb')assignModelThumbnail(picture,asset.id);else picture.src=workspace.mode==='3d'?url3d(asset.id):urlFor(asset.id);picture.alt=asset.name;const info=document.createElement('div');const title=document.createElement('strong');title.textContent=asset.name;const meta=document.createElement('small');meta.textContent=workspace.mode==='3d'?'3D / '+asset.category+' / '+asset.id+' • Mesh '+asset.shape:'2D / '+asset.category+' / '+asset.id+' • '+asset.width+'×'+asset.height+(genreKeywords(asset.id)?' • Genre : '+genreKeywords(asset.id).split(' ').slice(0,2).join(', '):'');const desc=document.createElement('span');desc.textContent='Prefab local • Cliquer deux fois pour instancier ou glisser dans Scene';info.append(title,meta,desc);const add=document.createElement('button');add.textContent='＋ Ajouter à la scène';add.disabled=state.playing;add.onclick=()=>{if(workspace.mode==='3d')add3d(asset.id);else addPrefab(asset.id);log('Prefab ajouté : '+asset.name)};const close=document.createElement('button');close.textContent='×';close.title='Fermer aperçu';close.onclick=()=>{selectedAsset=null;render()};if(workspace.mode==='3d'&&asset.shape==='glb'){
 const source=realModels3d.find(m=>m.id===asset.id);
 if(source?.url){
  const download=document.createElement('a');download.href=source.url;download.target='_blank';download.rel='noopener noreferrer';download.textContent='↓ Fichier GLB original';download.title='Ouvrir le téléchargement du véritable modèle GLB';info.append(download);
  const license=document.createElement('small');license.textContent='Licence : '+source.license;info.append(license);
 }
}
preview.append(picture,info,add,close)}
function render(){const query=search.value.trim().toLowerCase(),category=select.value;const library=workspace.mode==='3d'?allAssets3d():catalog;let found=library.filter(a=>(category==='All'||a.category===category)&&(!query||a.name.toLowerCase().includes(query)||a.id.includes(query)||(workspace.mode==='2d'&&genreKeywords(a.id).includes(query))));if(sort.value==='name')found=found.slice().sort((a,b)=>a.name.localeCompare(b.name));if(sort.value==='category')found=found.slice().sort((a,b)=>a.category.localeCompare(b.category)||a.name.localeCompare(b.name));grid.replaceChildren();grid.classList.toggle('asset-list-mode',view==='list');grid.style.setProperty('--asset-card-size',size.value+'px');$('#assetGridMode').classList.toggle('active',view==='grid');$('#assetListMode').classList.toggle('active',view==='list');for(const a of found){const button=document.createElement('button');button.className='asset';button.classList.toggle('selected',selectedAsset===a.id);button.title=a.category+' / '+a.name+' — double clic : ajouter';button.draggable=true;button.dataset.assetId=a.id;const img=document.createElement('img');if(workspace.mode==='3d'&&a.shape==='glb')assignModelThumbnail(img,a.id);else img.src=workspace.mode==='3d'?url3d(a.id):urlFor(a.id);img.alt='';img.loading='lazy';const label=document.createElement('span');label.className='asset-name';label.textContent=a.name;const secondary=document.createElement('small');secondary.textContent=a.category;button.append(img,label,secondary);button.onclick=()=>{selectedAsset=a.id;grid.querySelectorAll('.asset').forEach(el=>el.classList.toggle('selected',el.dataset.assetId===a.id));showPreview()};button.ondblclick=()=>{if(state.playing)return;if(workspace.mode==='3d')add3d(a.id);else addPrefab(a.id);log('Prefab ajouté : '+a.name)};button.ondragstart=e=>{e.dataTransfer.setData('application/x-warlike-asset',a.id);e.dataTransfer.effectAllowed='copy'};grid.append(button)}$('#assetCount').textContent=found.length+' / '+library.length+' assets';$('#assetBreadcrumb').textContent='Assets  ›  '+(category==='All'?'All Assets':category);$('#assetFooterText').textContent=found.length+' assets affichés • Glisser vers Scene • Double clic pour instancier';tree.querySelectorAll('button').forEach(b=>b.classList.toggle('active',b.dataset.folder===category));showPreview()}
document.addEventListener('warlike:workspace',()=>{
 import3dPanel.hidden=workspace.mode!=='3d';
 const list=workspace.mode==='3d'?categories3d:categories;
 const saved=select.value;
 select.replaceChildren(...list.map(cat=>{const o=document.createElement('option');o.value=cat;o.textContent=cat;return o}));
 select.value=list.includes(saved)?saved:'All';selectedAsset=null;
 for(const b of tree.querySelectorAll('[data-folder]')){const n=b.dataset.folder,catAssets=workspace.mode==='3d'?assets3d:catalog;b.hidden=!list.includes(n);b.querySelector('small').textContent=n==='All'?catAssets.length:catAssets.filter(a=>a.category===n).length}
 render();
});
search.oninput=render;select.onchange=()=>{selectedAsset=null;render()};sort.onchange=render;
$('#assetGridMode').onclick=()=>{view='grid';localStorage.setItem('warlike.assetView',view);render()};
$('#assetListMode').onclick=()=>{view='list';localStorage.setItem('warlike.assetView',view);render()};
size.oninput=()=>{localStorage.setItem('warlike.assetSize',size.value);grid.style.setProperty('--asset-card-size',size.value+'px')};
const center=document.querySelector('.center-stack'),splitter=$('#projectSplitter');
let dragHeight=null;const applyHeight=h=>{const max=Math.max(190,center.clientHeight-190);const value=Math.min(max,Math.max(190,h));center.style.setProperty('--project-height',value+'px');localStorage.setItem('warlike.projectHeight',String(value))};
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
