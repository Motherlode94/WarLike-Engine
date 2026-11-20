// Project/Assets lists the canonical project-owned Animator Controllers, not
// editor-only placeholder documents. Scene objects keep their runtime snapshots.
import {gameProject} from '../core/game-project.js';
import {state,notify} from '../core/state.js';
import {record} from '../core/history.js';
import {workspace} from '../core/workspaces.js';
import {toWorld} from '../core/camera.js';
import {view3d} from '../core/viewport-3d.js';
import {
 animatorControllerAssets,createAnimatorControllerAsset,assignAnimatorControllerAsset,
 removeAnimatorControllerAsset,validateAnimatorControllerAsset
} from '../core/animator-controller-assets.js';

export const animatorControllerDragType='application/x-warlike-animator-controller';

export function applyAnimatorControllerToObject(project,object,controllerId,{confirmReplace=()=>false}={}){
 if(!object||typeof controllerId!=='string'||!controllerId)throw Error('GameObject ou Controller manquant.');
 if(!animatorControllerAssets(project).some(a=>a.id===controllerId))throw Error('Animator Controller absent du projet actif.');
 if(object.animatorGraph&&!confirmReplace(object,controllerId))return false;
 assignAnimatorControllerAsset(project,object,controllerId);
 return true;
}

export function controllerDropId(event){
 const types=Array.from(event?.dataTransfer?.types||[]);
 return types.includes(animatorControllerDragType)?event.dataTransfer.getData(animatorControllerDragType):null;
}

export function installAnimatorControllerDrop(target,resolveObject){
 if(!target)return;
 target.addEventListener('dragover',event=>{
  if(state.playing||!Array.from(event.dataTransfer?.types||[]).includes(animatorControllerDragType)||!resolveObject())return;
  event.preventDefault();event.dataTransfer.dropEffect='copy';
 });
 target.addEventListener('drop',event=>{
  const id=controllerDropId(event);
  if(id===null||state.playing)return;
  event.preventDefault();event.stopPropagation();
  const object=resolveObject();
  if(!object)return;
  try{
   const changed=applyAnimatorControllerToObject(gameProject,object,id,{
    confirmReplace:()=>window.confirm('Remplacer le graphe Animator de « '+object.name+' » par ce Controller ? Ses clips, Avatar et autres composants restent conservés.')
   });
   if(changed){state.selected=[object.id];record('Assigner Animator Controller depuis Project/Assets');notify()}
  }catch(error){window.alert('Animator Controller : '+error.message)}
 });
}

// Resolve the target at the drop point. Never fall back to the selected object.
export function pickAnimatorSceneTarget2d(entities,point){
 return [...entities].reverse().find(o=>o.editorHidden!==true&&o.visible!==false&&
  point.x>=o.x&&point.x<=o.x+o.w&&point.y>=o.y&&point.y<=o.y+o.h)||null;
}
export function pickAnimatorSceneTarget3d(clientX,clientY){
 // The editor's existing pickAt uses actual GLB triangles where available,
 // including animated vertices; boxes are fallback for unloaded geometry.
 return typeof view3d.pickAt==='function'?view3d.pickAt(clientX,clientY):null;
}
export function resolveAnimatorSceneTarget(event,canvas,mode=workspace.mode){
 if(!canvas||state.playing)return null;
 const rect=canvas.getBoundingClientRect();
 if(!rect.width||!rect.height||event.clientX<rect.left||event.clientX>rect.right||
    event.clientY<rect.top||event.clientY>rect.bottom)return null;
 if(mode==='3d')return pickAnimatorSceneTarget3d(event.clientX,event.clientY);
 const point=toWorld({
  x:(event.clientX-rect.left)*canvas.clientWidth/rect.width,
  y:(event.clientY-rect.top)*canvas.clientHeight/rect.height
 });
 return pickAnimatorSceneTarget2d(state.entities,point);
}
export function installAnimatorControllerSceneDrop(){
 for(const [mode,selector] of [['2d','#canvas'],['3d','#canvas3d']]){
  const canvas=document.querySelector(selector);
  if(!canvas)continue;
  canvas.addEventListener('dragover',event=>{
   if(state.playing||workspace.mode!==mode||!Array.from(event.dataTransfer?.types||[]).includes(animatorControllerDragType))return;
   if(!resolveAnimatorSceneTarget(event,canvas,mode))return;
   event.preventDefault();event.dataTransfer.dropEffect='copy';
  });
  canvas.addEventListener('drop',event=>{
   const id=controllerDropId(event);
   if(state.playing||workspace.mode!==mode||id===null)return;
   event.preventDefault();event.stopPropagation();
   const object=resolveAnimatorSceneTarget(event,canvas,mode);
   if(!object)return; // Empty scene space must not affect any GameObject.
   try{
    const changed=applyAnimatorControllerToObject(gameProject,object,id,{
     confirmReplace:()=>window.confirm('Assigner le Controller à « '+object.name+' » dans Scene View ? Le graphe existant sera remplacé. Avatar, clips et modèle conservés.')
    });
    if(changed){state.selected=[object.id];record('Assigner Animator Controller dans Scene View');notify()}
   }catch(error){window.alert('Animator Controller : '+error.message)}
  });
 }
}

export function createNativeAnimatorControllerFromSelection(){
 if(state.playing)throw Error('Arrête Play avant de créer un Controller.');
 const object=state.entities.find(o=>o.id===state.selected.at(-1));
 if(!object?.animatorGraph)throw Error('Sélectionne un GameObject possédant un Animator.');
 const asset=createAnimatorControllerAsset(gameProject,object);
 record('Créer Animator Controller dans Project/Assets');notify();
 return asset;
}

export function mountAnimatorControllerProjectAssets(host){
 if(!host)return;
 const section=document.createElement('section');section.className='warlike-project-animator-assets';
 const heading=document.createElement('h4');heading.textContent='Animation / Animator Controllers';
 const summary=document.createElement('small');summary.className='warlike-project-animator-summary';
 const list=document.createElement('div');list.className='warlike-project-animator-list';
 section.append(heading,summary,list);host.append(section);
 const redraw=()=>{
  const assets=animatorControllerAssets(gameProject);section.hidden=!assets.length;
  summary.textContent=assets.length+' Controller(s) du projet · glisser sur un GameObject dans Scene, Hierarchy ou Inspector';
  list.replaceChildren();
  for(const asset of assets){
   const row=document.createElement('div');row.className='warlike-project-animator-item';
   row.dataset.animatorControllerId=asset.id;
   const handle=document.createElement('button');handle.type='button';handle.className='warlike-project-animator-drag';
   handle.textContent='▷ '+asset.name+' · v'+asset.revision;handle.title='Glisser vers Scene, Hierarchy ou Inspector pour affecter le Controller';
   handle.draggable=!state.playing;handle.disabled=state.playing;
   handle.addEventListener('dragstart',event=>{
    if(state.playing){event.preventDefault();return}
    event.dataTransfer.setData(animatorControllerDragType,asset.id);event.dataTransfer.effectAllowed='copy';
   });
   handle.onclick=()=>{
    if(state.playing)return;
    const object=state.entities.find(o=>o.id===state.selected.at(-1));
    if(!object){window.alert('Sélectionne un GameObject dans Hierarchy.');return}
    try{
     if(applyAnimatorControllerToObject(gameProject,object,asset.id,{
      confirmReplace:()=>window.confirm('Remplacer le graphe Animator de « '+object.name+' » ? Les clips et l’Avatar seront conservés.')
     })){record('Assigner Animator Controller');notify()}
    }catch(error){window.alert('Animator Controller : '+error.message)}
   };
   const rename=document.createElement('button');rename.type='button';rename.textContent='Renommer';rename.disabled=state.playing;
   rename.onclick=()=>{
    const name=window.prompt('Nouveau nom du Controller',asset.name)?.trim();
    if(name==null)return;
    const candidate={...asset,name};
    const errors=validateAnimatorControllerAsset(candidate);
    if(errors.length){window.alert(errors.join('; '));return}
    if(name===asset.name)return;
    asset.name=name;record('Renommer Animator Controller');notify();
   };
   const remove=document.createElement('button');remove.type='button';remove.textContent='Supprimer';remove.disabled=state.playing;
   remove.onclick=()=>{
    if(!window.confirm('Supprimer « '+asset.name+' » de Project/Assets ? Les GameObjects conservent leurs graphes et leurs animations.'))return;
    if(removeAnimatorControllerAsset(gameProject,asset.id)){record('Supprimer Animator Controller du projet');notify()}
   };
   row.append(handle,rename,remove);list.append(row);
  }
 };
 document.addEventListener('warlike:change',redraw);
 document.addEventListener('warlike:project-opened',redraw);
 document.addEventListener('warlike:project-documents-changed',redraw);
 // The Inspector element is stable even when its inner controls are replaced.
 const inspector=document.querySelector('#properties');
 if(inspector)installAnimatorControllerDrop(inspector,()=>state.entities.find(o=>o.id===state.selected.at(-1)));
 redraw();return section;
}
