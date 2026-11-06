import {getAsset,urlFor} from '../assets/catalog.js';
import {get3dAsset,url3d,prefab3d} from '../assets/catalog-3d.js';
import {state,notify} from '../core/state.js';
import {workspace} from '../core/workspaces.js';
import {addPrefab} from '../core/scene.js';
import {record} from '../core/history.js';
import {assignModelThumbnail} from './real-model-thumbnail.js';
import {assetCredits} from './asset-credits.js';
import {inspectorSelection,inspectorContext} from './inspector-context.js';
let selection=null,installed=false,selectionAtClick='';
export function inspectedAsset(){
 if(!selection)return null;
 if(selection.context!==inspectorContext()||!selection.locked&&selectionAtClick!==state.selected.join(',')){selection=null;return null}
 return selection.asset||(selection.mode==='3d'?get3dAsset(selection.id):getAsset(selection.id));
}
export const assetInspectorLock=()=>({locked:selection?.locked===true,toggle:()=>{if(selection)selection.locked=!selection.locked}});
export function initAssetInspection(){
 if(installed)return;installed=true;
 document.addEventListener('warlike:inspect-asset',event=>{if(inspectorSelection.locked||selection?.locked)return;selection={id:event.detail?.id,mode:workspace.mode,context:inspectorContext(),asset:event.detail?.asset,kind:event.detail?.kind,open:event.detail?.open};selectionAtClick=state.selected.join(',');notify()});
 document.addEventListener('pointerdown',event=>{if(selection&&!selection.locked&&event.target.closest?.('#objects,#canvas,#canvas3d')){selection=null;notify()}if(!event.target.closest?.('.component-menu-toggle,.inspector-component-actions')){document.querySelectorAll('.inspector-component-actions').forEach(menu=>menu.hidden=true);document.querySelectorAll('.component-menu-toggle').forEach(button=>button.setAttribute('aria-expanded','false'))}},true);
 document.addEventListener('warlike:workspace',()=>{selection=null});
}
export function renderAssetInspector(root,asset){
 const header=document.createElement('div');header.className='inspector-object';
 const title=document.createElement('strong');title.textContent=asset.name;const type=document.createElement('small');type.textContent='Ressource '+(selection?.kind||workspace.mode).toUpperCase()+' · '+(asset.category||'Projet');header.append(title,type);root.append(header);
 const preview=document.createElement('img');preview.className='inspector-asset-preview';preview.src=asset.spriteUrl||(workspace.mode==='3d'?url3d(asset.previewModelId||asset.id):urlFor(asset.id));if(asset.shape==='glb')assignModelThumbnail(preview,asset.previewModelId||asset.id);preview.alt='Aperçu : '+asset.name;if(!['scene','script','audio','prefab'].includes(selection?.kind))root.append(preview);
 const fields=document.createElement('dl');fields.className='inspector-asset-metadata';
 for(const [label,value] of [['Identifiant',asset.id],['Type',asset.shape||asset.sourceType||asset.kind],['Dimensions',asset.width&&asset.height?asset.width+' × '+asset.height:null],['Source',asset.sourcePath||asset.url||(asset.spriteUrl?.startsWith('data:')?'Image intégrée au projet':asset.spriteUrl)],['Collection',asset.collection||asset.packName]])if(value){const name=document.createElement('dt'),data=document.createElement('dd');name.textContent=label;data.textContent=String(value);fields.append(name,data)}root.append(fields);
 if(asset.author)root.append(assetCredits(asset));
 const add=document.createElement('button');add.type='button';add.className='inspector-asset-add';const kind=selection?.kind,open=selection?.open;add.textContent=kind==='script'?'Ouvrir dans Script Studio':kind==='scene'?'Ouvrir la scène':kind==='audio'?'Écouter le son':kind==='animation'?'Prévisualiser l’animation':'Ajouter une instance à la scène';add.disabled=state.playing;
 add.onclick=()=>{if(state.playing)return;selection=null;if(open){open();return}if(workspace.mode==='3d'){const object=prefab3d(asset.id,state.nextId);if(!object)return;state.nextId++;state.entities.push(object);state.selected=[object.id];record('Ajouter '+asset.name);notify()}else addPrefab(asset.id)};
 const note=document.createElement('p');note.className='inspector-multi-note';note.textContent='Métadonnées de la ressource en lecture seule. Les propriétés de jeu se modifient sur ses instances dans la scène.';root.append(add,note);
}
