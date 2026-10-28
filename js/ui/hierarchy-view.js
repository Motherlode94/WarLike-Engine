import {state,notify} from '../core/state.js';
import {gameProject} from '../core/game-project.js';
import {workspace} from '../core/workspaces.js';
import {get3dAsset} from '../assets/catalog-3d.js';
import {getAsset} from '../assets/catalog.js';
import {record} from '../core/history.js';
const key='warlike.hierarchy.folds.v1';let folds={};try{folds=JSON.parse(localStorage.getItem(key)||'{}')}catch{}
const el=(tag,cls,text)=>{const node=document.createElement(tag);node.className=cls;if(text)node.textContent=text;return node};
const iconFor=o=>o.lightType?'☀':o.audioEnabled?'♫':(workspace.mode==='3d'?get3dAsset(o.model3dId||o.assetId):getAsset(o.assetId))?.category==='Characters'?'♙':o.assetId?'◇':'□';
export function renderSceneHierarchy(){
 const root=document.querySelector('#objects');if(!root)return;
 const scroll=root.scrollTop,filter=(document.querySelector('#hierarchySearch')?.value||'').trim().toLocaleLowerCase('fr');root.replaceChildren();
 const current=gameProject.scenes.find(scene=>scene.id===gameProject.activeSceneId),scene=el('div','unity-scene-root'),title=el('strong','',current?.name||(workspace.mode==='3d'?'Scène 3D':'Scène 2D'));scene.append(el('span','unity-scene-icon','▾ ◇'),title);root.append(scene);
 const groups=new Map();for(const object of state.entities){if(filter&&!(object.name+' '+(object.hierarchyGroup||'')).toLocaleLowerCase('fr').includes(filter))continue;const group=object.hierarchyGroup||'';if(!groups.has(group))groups.set(group,[]);groups.get(group).push(object)}
 const order=['Joueur','Environnement','Bâtiments','Végétation','Campement','Armurerie','Véhicules','Ennemis','Audio et lumière'];
 const sorted=[...groups].sort(([a],[b])=>{const rank=s=>order.includes(s)?order.indexOf(s):99;return rank(a)-rank(b)||a.localeCompare(b)});
 for(const [name,objects] of sorted){
  let parent=root;
  if(name){const group=el('details','unity-hierarchy-group');group.open=!!filter||(folds[name]??name!=='Végétation');const heading=el('summary','unity-hierarchy-group-title');heading.append(el('span','unity-folder-icon','▱'),el('span','',name),el('small','',String(objects.length)));group.append(heading);group.addEventListener('toggle',()=>{if(filter)return;folds[name]=group.open;try{localStorage.setItem(key,JSON.stringify(folds))}catch{}});root.append(group);parent=group}
  for(const object of objects){
   const row=el('div','unity-hierarchy-row');row.dataset.objectId=String(object.id);row.classList.toggle('selected',state.selected.includes(object.id));row.classList.toggle('editor-hidden',object.editorHidden===true);
   const eye=el('button','hierarchy-eye',object.editorHidden?'◌':'◉');eye.type='button';eye.title=(object.editorHidden?'Afficher':'Masquer')+' dans la vue de travail';eye.setAttribute('aria-label',eye.title+' : '+object.name);eye.setAttribute('aria-pressed',String(object.editorHidden===true));eye.disabled=state.playing;eye.onclick=()=>{object.editorHidden=!object.editorHidden;record('Visibilité de travail : '+object.name);notify()};
   const button=el('button','hierarchy-object-label');button.type='button';button.title=object.name;button.append(el('span','hierarchy-object-icon',iconFor(object)),el('span','hierarchy-object-name',object.name));button.onclick=e=>{state.selected=e.shiftKey||e.ctrlKey||e.metaKey?(state.selected.includes(object.id)?state.selected.filter(id=>id!==object.id):[...state.selected,object.id]):[object.id];notify()};button.ondblclick=()=>{if(workspace.mode==='3d')document.getElementById('view3dFocus')?.click();else document.getElementById('resetView')?.click()};button.onkeydown=e=>{if(e.key==='F2'){e.preventDefault();const field=document.querySelector('.inspector-object-name');field?.focus();field?.select()}};
   row.append(eye,button);if(object.sequence||object.ai||object.controller3d||object.csharpScript){const badge=el('span','hierarchy-component-mark',object.csharpScript?'C#':object.sequence?'⬡':object.ai?'AI':'▣');badge.title=object.csharpScript?'Script C# local':object.sequence?'Comportement Blueprint':object.ai?'Intelligence artificielle':'Contrôleur de personnage';row.append(badge)}parent.append(row);
  }
 }
 if(!groups.size)root.append(el('p','unity-hierarchy-empty',filter?'Aucun objet correspondant.':'La scène est vide.'));root.scrollTop=scroll;
}
