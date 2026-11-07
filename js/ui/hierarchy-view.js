import {state,notify} from '../core/state.js';
import {gameProject} from '../core/game-project.js';
import {workspace} from '../core/workspaces.js';
import {get3dAsset} from '../assets/catalog-3d.js';
import {getAsset} from '../assets/catalog.js';
import {record} from '../core/history.js';
import {reparentSelected} from '../core/scene.js';
const key='warlike.hierarchy.folds.v1';let folds={};try{folds=JSON.parse(localStorage.getItem(key)||'{}')}catch{}
const el=(tag,cls,text)=>{const node=document.createElement(tag);node.className=cls;if(text)node.textContent=text;return node};
const iconFor=o=>o.lightType?'☀':o.audioEnabled?'♫':(workspace.mode==='3d'?get3dAsset(o.model3dId||o.assetId):getAsset(o.assetId))?.category==='Characters'?'♙':o.assetId?'◇':'□';
export function renderSceneHierarchy(){
 const root=document.querySelector('#objects');if(!root)return;
 const scroll=root.scrollTop,query=(document.querySelector('#hierarchySearch')?.value||'').trim().toLocaleLowerCase('fr');root.replaceChildren();
 const current=gameProject.scenes.find(scene=>scene.id===gameProject.activeSceneId);
 const scene=el('div','unity-scene-root'),title=el('strong','',current?.name||(workspace.mode==='3d'?'Scène 3D':'Scène 2D'));
 scene.append(el('span','unity-scene-icon','▾ ◇'),title);root.append(scene);
 const byId=new Map(state.entities.map(o=>[o.id,o]));
 const children=new Map(),top=[];
 for(const object of state.entities){
  if(object.parentId!==null&&object.parentId!==undefined&&object.parentId!==object.id&&byId.has(object.parentId)){
   if(!children.has(object.parentId))children.set(object.parentId,[]);
   children.get(object.parentId).push(object);
  }else top.push(object);
 }
 const matching=new Set();
 function mark(object,seen=new Set()){
  if(seen.has(object.id))return false;
  seen.add(object.id);
  let ok=!query||(object.name+' '+(object.hierarchyGroup||'')).toLocaleLowerCase('fr').includes(query);
  for(const child of children.get(object.id)||[])ok=mark(child,new Set(seen))||ok;
  if(ok)matching.add(object.id);
  return ok;
 }
 top.forEach(object=>mark(object));
 const dropTarget=(host,parentId)=>{
  host.addEventListener('dragover',event=>{
   if(state.playing||!event.dataTransfer?.types.includes('application/x-warlike-object'))return;
   event.preventDefault();event.dataTransfer.dropEffect='move';
  });
  host.addEventListener('drop',event=>{
   const raw=event.dataTransfer?.getData('application/x-warlike-object');
   if(state.playing||!/^[0-9]+$/.test(raw||''))return;
   event.preventDefault();event.stopPropagation();
   const id=Number(raw);
   if(id===parentId)return;
   try{reparentSelected(id,parentId)}catch(error){window.alert('Hiérarchie : '+error.message)}
  });
 };
 dropTarget(scene,null);
 const createRow=(object,depth,visited)=>{
  if(visited.has(object.id)||!matching.has(object.id))return null;
  const row=el('div','unity-hierarchy-row');row.dataset.objectId=String(object.id);
  row.style.paddingLeft=Math.min(depth,20)*14+'px';row.setAttribute('role','treeitem');row.setAttribute('aria-level',String(depth+1));
  row.setAttribute('aria-selected',String(state.selected.includes(object.id)));
  row.classList.toggle('selected',state.selected.includes(object.id));row.classList.toggle('editor-hidden',object.editorHidden===true);
  const eye=el('button','hierarchy-eye',object.editorHidden?'◌':'◉');
  eye.type='button';eye.title=(object.editorHidden?'Afficher':'Masquer')+' dans la vue de travail';
  eye.setAttribute('aria-label',eye.title+' : '+object.name);eye.setAttribute('aria-pressed',String(object.editorHidden===true));eye.disabled=state.playing;
  eye.onclick=()=>{object.editorHidden=!object.editorHidden;record('Visibilité de travail : '+object.name);notify()};
  const button=el('button','hierarchy-object-label');
  button.type='button';button.title=object.name;button.append(el('span','hierarchy-object-icon',iconFor(object)),el('span','hierarchy-object-name',object.name));
  button.onclick=event=>{state.selected=event.shiftKey||event.ctrlKey||event.metaKey?(state.selected.includes(object.id)?state.selected.filter(id=>id!==object.id):[...state.selected,object.id]):[object.id];notify()};
  button.ondblclick=()=>{if(workspace.mode==='3d')document.getElementById('view3dFocus')?.click();else document.getElementById('resetView')?.click()};
  button.onkeydown=event=>{if(event.key==='F2'){event.preventDefault();const field=document.querySelector('.inspector-object-name');field?.focus();field?.select()}};
  button.draggable=!state.playing;
  button.addEventListener('dragstart',event=>{event.dataTransfer.setData('application/x-warlike-object',String(object.id));event.dataTransfer.effectAllowed='move'});
  row.append(eye,button);
  if(children.has(object.id)){const count=el('small','hierarchy-component-mark',String(children.get(object.id).length));count.title='Objets enfants';row.append(count)}
  if(object.sequence||object.ai||object.controller3d||object.csharpScript){const badge=el('span','hierarchy-component-mark',object.csharpScript?'C#':object.sequence?'⬡':object.ai?'AI':'▣');row.append(badge)}
  dropTarget(row,object.id);
  const wrapper=document.createDocumentFragment();wrapper.append(row);
  const expanded=folds['object:'+object.id]!==false;
  if(children.get(object.id)?.length){
   const fold=el('button','hierarchy-tree-toggle',expanded?'▾':'▸');
   fold.type='button';fold.title=expanded?'Replier les enfants':'Déplier les enfants';fold.setAttribute('aria-expanded',String(expanded));
   fold.onclick=()=>{folds['object:'+object.id]=!expanded;try{localStorage.setItem(key,JSON.stringify(folds))}catch{}renderSceneHierarchy()};
   row.prepend(fold);
   if(expanded||query){const next=new Set(visited);next.add(object.id);for(const child of children.get(object.id)||[]){const node=createRow(child,depth+1,next);if(node)wrapper.append(node)}}
  }
  return wrapper;
 };
 const groups=new Map();
 for(const object of top){if(!matching.has(object.id))continue;const name=object.hierarchyGroup||'';if(!groups.has(name))groups.set(name,[]);groups.get(name).push(object)}
 const order=['Joueur','Environnement','Bâtiments','Végétation','Campement','Armurerie','Véhicules','Ennemis','Audio et lumière'];
 const sorted=[...groups].sort(([a],[b])=>{const rank=n=>order.includes(n)?order.indexOf(n):99;return rank(a)-rank(b)||a.localeCompare(b)});
 for(const [name,objects] of sorted){
  let parent=root;
  if(name){const group=el('details','unity-hierarchy-group');group.open=!!query||(folds[name]??name!=='Végétation');
   const heading=el('summary','unity-hierarchy-group-title');heading.append(el('span','unity-folder-icon','▱'),el('span','',name),el('small','',String(objects.length)));group.append(heading);
   group.addEventListener('toggle',()=>{if(query)return;folds[name]=group.open;try{localStorage.setItem(key,JSON.stringify(folds))}catch{}});
   root.append(group);parent=group;
  }
  for(const object of objects){const node=createRow(object,0,new Set());if(node)parent.append(node)}
 }
 if(!groups.size)root.append(el('p','unity-hierarchy-empty',query?'Aucun objet correspondant.':'La scène est vide.'));
 root.scrollTop=scroll;
}
