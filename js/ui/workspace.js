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
const tree=$('#assetFolders'),select=$('#assetCategory'),search=$('#assetSearch'),grid=$('#assetGrid');
function selectFolder(cat){select.value=cat;render();tree.querySelectorAll('button').forEach(b=>b.classList.toggle('active',b.dataset.folder===cat))}
for(const category of categories){const btn=document.createElement('button');btn.dataset.folder=category;btn.textContent=(category==='All'?'▦':'▸')+' '+(category==='All'?'Assets':category);btn.onclick=()=>selectFolder(category);tree.append(btn)}
function render(){const q=search.value.trim().toLowerCase(),category=select.value;const filtered=catalog.filter(a=>(category==='All'||a.category===category)&&(!q||a.name.toLowerCase().includes(q)||a.id.includes(q)));grid.replaceChildren();for(const a of filtered){const button=document.createElement('button');button.className='asset';button.title=a.category+' / '+a.name;button.draggable=true;const img=document.createElement('img');img.src=urlFor(a.id);img.alt='';img.loading='lazy';const label=document.createElement('span');label.textContent=a.name;button.append(img,label);button.onclick=()=>{addPrefab(a.id);log('Prefab ajouté : '+a.name)};button.ondragstart=e=>{e.dataTransfer.setData('application/x-warlike-asset',a.id);e.dataTransfer.effectAllowed='copy'};grid.append(button)}
$('#assetCount').textContent=filtered.length+' / '+catalog.length+' assets';$('#assetBreadcrumb').textContent='Assets / '+(category==='All'?'All':category);tree.querySelectorAll('button').forEach(b=>b.classList.toggle('active',b.dataset.folder===category))}
search.oninput=render;select.onchange=render;render();
const canvas=$('#canvas');canvas.addEventListener('dragover',e=>{if(e.dataTransfer.types.includes('application/x-warlike-asset'))e.preventDefault()});canvas.addEventListener('drop',e=>{e.preventDefault();const id=e.dataTransfer.getData('application/x-warlike-asset');if(!catalog.some(a=>a.id===id)||state.playing)return;addPrefab(id);const item=state.entities.find(o=>o.id===state.selected.at(-1));if(item){const rect=canvas.getBoundingClientRect(),p={x:e.clientX-rect.left,y:e.clientY-rect.top};item.x=Math.round((p.x-state.camera.x)/state.camera.zoom-item.w/2);item.y=Math.round((p.y-state.camera.y)/state.camera.zoom-item.h/2);notify()}log('Déposé : '+id)});
window.addEventListener('keydown',e=>{if(['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName)||e.ctrlKey||e.metaKey||state.playing)return;const map={q:'hand',w:'move',e:'rotate',r:'scale',t:'rect'};if(map[e.key.toLowerCase()])setTool(map[e.key.toLowerCase()])});
log('WarLike Engine editor démarré');}
