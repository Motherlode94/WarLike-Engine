import {catalog,urlFor} from './assets/catalog.js';
import {state,notify} from './core/state.js';
import {autoSave,recoverLocal,beginAutoSave,connectCloud} from './core/storage.js';
import {zoomAt,resetCamera} from './core/camera.js';
import {record,undo,redo} from './core/history.js';
import {addEntity,addPrefab,duplicateSelected,togglePlay,exportScene,importScene} from './core/scene.js';
import {renderUI} from './ui/inspector.js';
import {attachInput} from './core/input.js';
import {startRenderer} from './core/renderer.js';
const $=s=>document.querySelector(s),canvas=$('#canvas'),host=$('#viewport');
$('#add').onclick=()=>addEntity('object');
$('#player').onclick=()=>addEntity('player');
$('#undo').onclick=undo;
$('#redo').onclick=redo;
$('#play').onclick=togglePlay;
$('#save').onclick=exportScene;
$('#load').onclick=()=>$('#file').click();
$('#file').onchange=async e=>{try{await importScene(e.target.files?.[0])}catch(error){alert('Impossible de charger la scène : '+error.message)}finally{e.target.value=''}};
$('#zoomIn').onclick=()=>zoomAt(1.25,{x:host.clientWidth/2,y:host.clientHeight/2});
$('#zoomOut').onclick=()=>zoomAt(.8,{x:host.clientWidth/2,y:host.clientHeight/2});
$('#resetView').onclick=resetCamera;
attachInput(canvas,host);
if(!recoverLocal())record('Scène initiale');
beginAutoSave();
$('#cloudConnect').onclick=connectCloud;
renderUI();
startRenderer(canvas,host);

const sceneTab=$('#sceneTab'),gameTab=$('#gameTab');
function syncTabs(){sceneTab.classList.toggle('active',!state.playing);gameTab.classList.toggle('active',state.playing)}
sceneTab.onclick=()=>{if(state.playing)togglePlay();syncTabs()};
gameTab.onclick=()=>{if(!state.playing)togglePlay();syncTabs()};
$('#play').addEventListener('click',syncTabs);
$('#duplicate').onclick=duplicateSelected;
const assetGrid=$('#assetGrid'),search=$('#assetSearch'),category=$('#assetCategory');
function renderAssets(){const term=search.value.trim().toLowerCase(),kind=category.value;const found=catalog.filter(a=>(kind==='All'||a.category===kind)&&(!term||a.name.toLowerCase().includes(term)||a.id.includes(term)));assetGrid.replaceChildren();for(const asset of found){const btn=document.createElement('button');btn.className='asset';btn.title=asset.category+' / '+asset.name+' — cliquer pour insérer';const image=document.createElement('img');image.src=urlFor(asset.id);image.alt='';image.loading='lazy';const label=document.createElement('span');label.textContent=asset.name;btn.append(image,label);btn.onclick=()=>addPrefab(asset.id);assetGrid.append(btn)}$('#assetCount').textContent=found.length+' / '+catalog.length+' assets'}
search.oninput=renderAssets;category.onchange=renderAssets;renderAssets();
window.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='d'&&!['INPUT','TEXTAREA'].includes(document.activeElement?.tagName)){e.preventDefault();duplicateSelected()}});
