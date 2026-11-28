import {state,notify} from '../core/state.js';
import {gameProject} from '../core/game-project.js';
import {workspace} from '../core/workspaces.js';
import {get3dAsset} from '../assets/catalog-3d.js';
import {getAsset} from '../assets/catalog.js';
import {record} from '../core/history.js';
import {installAnimatorControllerDrop} from './project-animator-assets.js';
import {reparentSelected} from '../core/scene.js';
const key='warlike.hierarchy.folds.v1';let folds={};try{folds=JSON.parse(localStorage.getItem(key)||'{}')}catch{}
const el=(tag,cls,text)=>{const node=document.createElement(tag);node.className=cls;if(text)node.textContent=text;return node};
export function hierarchyRowMetadata(object){
 const tag=Array.isArray(object?.tags)&&object.tags.length?String(object.tags[0]):'Untagged';
 const layer=typeof object?.layer==='string'&&object.layer.trim()?object.layer.trim():'Default';
 const scripts=Number(Boolean(object?.csharpScript))+(object?.warScripts?.length||0)+(object?.webScripts?.length||0);
 return {tag,layer,scripts,static:object?.isStatic===true||object?.static===true};
}
const foldsAll=value=>{
 const keys=state.entities.map(o=>'object:'+o.id);
 for(const key of keys)folds[key]=value;
 try{localStorage.setItem(key,JSON.stringify(folds))}catch{}
 renderSceneHierarchy();
};
function objectIcon(object){
 const icon=document.createElementNS('http://www.w3.org/2000/svg','svg');
 icon.setAttribute('viewBox','0 0 16 16');icon.setAttribute('aria-hidden','true');icon.classList.add('hierarchy-object-icon');
 const character=(workspace.mode==='3d'?get3dAsset(object.model3dId||object.assetId):getAsset(object.assetId))?.category==='Characters';
 const path=object.sceneCamera3d||object.camera2d?'M2 4h8v8H2z M10 6l4-2v8l-4-2':object.lightType?'M8 1v2 M8 13v2 M1 8h2 M13 8h2 M3 3l1 1 M12 12l1 1 M3 13l1-1 M12 4l1-1 M11 8a3 3 0 1 1-6 0 3 3 0 0 1 6 0':object.audioEnabled?'M3 6h3l4-3v10l-4-3H3z M12 5q4 3 0 6':character?'M10 3a2 2 0 1 1-4 0 2 2 0 0 1 4 0 M4 8l4-2 4 2 M8 6v5 M5 15l3-4 3 4':'M8 1l6 3v8l-6 3-6-3V4z M2 4l6 3 6-3 M8 7v8';
 const line=document.createElementNS(icon.namespaceURI,'path');line.setAttribute('d',path);line.setAttribute('fill','none');line.setAttribute('stroke','currentColor');line.setAttribute('stroke-width','1.2');line.setAttribute('stroke-linejoin','round');icon.append(line);return icon;
}
export function renderSceneHierarchy(){
 const root=document.querySelector('#objects');if(!root)return;
 const panel=document.getElementById('hierarchyPanel');
 // Keep History available from the Hierarchy header instead of reserving an
 // unrelated full-width row below the GameObject tree.
 const history=panel?.querySelector('.hierarchy-history');
 const headerActions=panel?.querySelector('.dock-title-actions');
 if(history&&headerActions&&history.parentElement!==headerActions){
  history.open=false;
  headerActions.insertBefore(history,headerActions.firstChild);
 }

 const focused=document.activeElement?.closest('.unity-hierarchy-row')?.dataset.objectId;
 root.setAttribute('role','tree');root.setAttribute('aria-label','Objets de la scène');root.setAttribute('aria-multiselectable','true');
 const scroll=root.scrollTop,query=(document.querySelector('#hierarchySearch')?.value||'').trim().toLocaleLowerCase('fr');root.replaceChildren();
 const toolbar=el('div','unity-hierarchy-quicktools');
 const command=(text,title,callback)=>{const b=el('button','',text);b.type='button';b.title=title;b.setAttribute('aria-label',title);b.onclick=callback;return b};
 toolbar.append(
  command('▾','Déplier tous les GameObjects',()=>foldsAll(true)),
  command('▸','Replier tous les GameObjects',()=>foldsAll(false))
 );
 const summary=el('span','unity-hierarchy-total',state.entities.length+' objets');toolbar.append(summary);
 const current=gameProject.scenes.find(scene=>scene.id===gameProject.activeSceneId);
 const scene=el('div','unity-scene-root'),title=el('strong','',current?.name||(workspace.mode==='3d'?'Scène 3D':'Scène 2D'));
 scene.append(el('span','unity-scene-icon','◇'),title,toolbar);root.append(scene);
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
  row.classList.toggle('hierarchy-static',object.isStatic===true||object.static===true);
  const eye=el('button','hierarchy-eye');eye.innerHTML='<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M1 8q7-9 14 0-7 9-14 0z"/><circle cx="8" cy="8" r="2"/></svg>';
  eye.type='button';eye.title=(object.editorHidden?'Afficher':'Masquer')+' dans la vue de travail';
  eye.setAttribute('aria-label',eye.title+' : '+object.name);eye.setAttribute('aria-pressed',String(object.editorHidden===true));eye.disabled=state.playing;
  eye.onclick=()=>{object.editorHidden=!object.editorHidden;record('Visibilité de travail : '+object.name);notify()};
  const button=el('button','hierarchy-object-label');
  button.type='button';button.title=object.name;button.append(objectIcon(object),el('span','hierarchy-object-name',object.name));
  button.onclick=event=>{state.selected=event.shiftKey||event.ctrlKey||event.metaKey?(state.selected.includes(object.id)?state.selected.filter(id=>id!==object.id):[...state.selected,object.id]):[object.id];notify()};
  button.setAttribute('aria-label','Sélectionner '+object.name);
  button.ondblclick=()=>{if(workspace.mode==='3d')document.getElementById('view3dFocus')?.click();else document.getElementById('resetView')?.click()};
  button.onkeydown=event=>{if(event.key==='F2'){event.preventDefault();const field=document.querySelector('.inspector-object-name');field?.focus();field?.select()}};
  button.draggable=!state.playing;
  button.addEventListener('dragstart',event=>{event.dataTransfer.setData('application/x-warlike-object',String(object.id));event.dataTransfer.effectAllowed='move'});
  const branch=el('span','hierarchy-tree-spacer');branch.setAttribute('aria-hidden','true');row.append(eye,branch,button);
  const meta=hierarchyRowMetadata(object),markers=el('span','hierarchy-row-metadata');
  if(meta.scripts){const mark=el('span','hierarchy-script-icon','⌗');mark.title=meta.scripts+' script(s)';markers.append(mark)}
  const tag=el('span','hierarchy-row-tag',meta.tag);tag.title='Tag : '+meta.tag;markers.append(tag);
  const layer=el('span','hierarchy-row-layer',meta.layer);layer.title='Layer : '+meta.layer;markers.append(layer);
  if(meta.static){const staticBadge=el('span','hierarchy-row-static','S');staticBadge.title='Objet statique';markers.append(staticBadge)}
  row.append(markers);
  if(children.has(object.id)){const count=el('small','hierarchy-component-mark',String(children.get(object.id).length));count.title='Objets enfants';row.append(count)}
  if(object.sequence||object.ai||object.controller3d||object.csharpScript){const badge=el('span','hierarchy-component-mark',object.csharpScript?'C#':object.sequence?'⬡':object.ai?'AI':'▣');row.append(badge)}
  dropTarget(row,object.id);
  installAnimatorControllerDrop(row,()=>state.entities.find(entity=>entity.id===object.id));
  const wrapper=document.createDocumentFragment();wrapper.append(row);
  const expanded=folds['object:'+object.id]!==false;
  if(children.get(object.id)?.length){
   const fold=el('button','hierarchy-tree-toggle',expanded?'▾':'▸');
   fold.type='button';fold.title=expanded?'Replier les enfants':'Déplier les enfants';fold.setAttribute('aria-expanded',String(expanded));
   fold.onclick=()=>{folds['object:'+object.id]=!expanded;try{localStorage.setItem(key,JSON.stringify(folds))}catch{}renderSceneHierarchy()};
   row.replaceChild(fold,branch);row.setAttribute('aria-expanded',String(expanded||!!query));
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
 summary.textContent=state.entities.length+' objets'+(query?' · filtre actif':'');
 root.onkeydown=event=>{
  if(!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
  const row=event.target.closest('.unity-hierarchy-row');if(!row)return;
  const rows=[...root.querySelectorAll('.unity-hierarchy-row')].filter(node=>node.getClientRects().length),index=rows.indexOf(row);
  let target=null;
  if(event.key==='ArrowDown')target=rows[Math.min(index+1,rows.length-1)];
  if(event.key==='ArrowUp')target=rows[Math.max(0,index-1)];
  if(event.key==='Home')target=rows[0];if(event.key==='End')target=rows.at(-1);
  if(event.key==='ArrowRight'){if(row.getAttribute('aria-expanded')==='false')row.querySelector('.hierarchy-tree-toggle')?.click();else if(Number(rows[index+1]?.getAttribute('aria-level'))>Number(row.getAttribute('aria-level')))target=rows[index+1]}
  if(event.key==='ArrowLeft'){if(row.getAttribute('aria-expanded')==='true')row.querySelector('.hierarchy-tree-toggle')?.click();else{const parentId=byId.get(Number(row.dataset.objectId))?.parentId;target=rows.find(node=>Number(node.dataset.objectId)===parentId)}}
  event.preventDefault();if(target){const label=target.querySelector('.hierarchy-object-label');label?.click();root.querySelector('[data-object-id="'+target.dataset.objectId+'"] .hierarchy-object-label')?.focus()}
 };
 if(focused)root.querySelector('[data-object-id="'+focused+'"] .hierarchy-object-label')?.focus({preventScroll:true});
 root.scrollTop=scroll;
}
