import {workspace} from '../core/workspaces.js';
import {presetsForWorkspace,createBlueprintPreset} from '../core/blueprint-presets.js';
import {active,state} from '../core/state.js';
import {renderSequenceEditor} from './logic-sequence-editor.js';
import {newSequence} from '../core/logic-sequences.js';
import {record} from '../core/history.js';
import {notify} from '../core/state.js';

// WarLike Blueprint is an editor for the same runtime sequences used in 2D and 3D.
// It does not introduce a second scene format or an incompatible scripting engine.
export function initBlueprintWorkspace(){
 const openButton=document.getElementById('openBlueprint');
 const dialog=document.getElementById('blueprintDialog');
 const content=document.getElementById('blueprintContent');
 const target=document.getElementById('blueprintTarget');
 const close=document.getElementById('blueprintClose');
 const add=document.getElementById('blueprintAdd');
 if(!openButton||!dialog||!content)return;
 const render=()=>{
  const o=active();
  content.replaceChildren();
  target.textContent=(workspace.mode==='3d'?'⬡ 3D':'◫ 2D')+' · '+(o?'Objet : '+(o.name||'GameObject')+' · ID '+o.id:'Aucun GameObject sélectionné');
  add.disabled=!o||state.playing||!!o.sequence;
  if(!o){
   const p=document.createElement('p');p.textContent='Sélectionne un objet dans Hierarchy pour créer son Blueprint.';content.append(p);return;
  }
  const note=document.createElement('p');note.className='blueprint-note';
  note.textContent='WarLike Blueprint utilise le moteur de séquences du projet. Les modifications sont enregistrées dans la scène et exécutées pendant Play.';
  content.append(note);
  const library=document.createElement('div');library.className='blueprint-preset-bar';
  const exportButton=document.createElement('button');exportButton.type='button';exportButton.textContent='↓ Exporter ce Blueprint';exportButton.disabled=!o.sequence;
  exportButton.onclick=()=>{
   if(!o.sequence)return;
   const blob=new Blob([JSON.stringify({format:'warlike.blueprint.v1',sequence:o.sequence},null,2)],{type:'application/json'});
   const url=URL.createObjectURL(blob),anchor=document.createElement('a');anchor.href=url;anchor.download='warlike-blueprint-'+o.id+'.json';anchor.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  };
  const importButton=document.createElement('button');importButton.type='button';importButton.textContent='↑ Importer un Blueprint';importButton.disabled=state.playing;
  const file=document.createElement('input');file.type='file';file.accept='.json,application/json';file.hidden=true;file.onchange=async()=>{
   try{
    const uploaded=file.files?.[0];if(!uploaded)return;
    if(uploaded.size>1024*512)throw Error('Fichier trop volumineux (512 Ko maximum).');
    const data=JSON.parse(await uploaded.text());
    if(data?.format!=='warlike.blueprint.v1'||!data.sequence||typeof data.sequence!=='object'||Array.isArray(data.sequence))throw Error('Format Blueprint non reconnu.');
    if(data.sequence.graph){const {inspectGraph,applyGraph}=await import('../core/blueprint-graph.js');const issues=inspectGraph(data.sequence.graph);if(issues.length)throw Error(issues.join(' · '));applyGraph(data.sequence)}
    if(!window.confirm('Importer le Blueprint et remplacer la logique de cet objet ?'))return;
    o.sequence=structuredClone(data.sequence);record('Importer Blueprint');notify();
   }catch(error){window.alert('Import Blueprint : '+error.message)}finally{file.value=''}
  };
  importButton.onclick=()=>file.click();library.append(exportButton,importButton,file);content.append(library);
  const presets=document.createElement('section');presets.className='blueprint-preset-bar';
  const caption=document.createElement('strong');caption.textContent='Modèles Blueprint '+workspace.mode.toUpperCase();presets.append(caption);
  const actions=document.createElement('div');actions.className='blueprint-preset-actions';
  for(const preset of presetsForWorkspace(workspace.mode)){
   const button=document.createElement('button');button.type='button';button.textContent=preset.label;button.title=preset.description;
   button.disabled=state.playing;
   button.onclick=()=>{
    if(state.playing||!window.confirm('Remplacer le Blueprint de cet objet par « '+preset.label+' » ?'))return;
    o.sequence=createBlueprintPreset(preset.id,workspace.mode);
    record('Blueprint '+workspace.mode.toUpperCase()+' : '+preset.label);notify();
   };
   actions.append(button);
  }
  presets.append(actions);content.append(presets);
  renderSequenceEditor(content,o);
 };
 const show=()=>{render();dialog.hidden=false;openButton.setAttribute('aria-expanded','true')};
 const hide=()=>{dialog.hidden=true;openButton.setAttribute('aria-expanded','false');openButton.focus()};
 openButton.addEventListener('click',()=>dialog.hidden?show():hide());
 close.addEventListener('click',hide);
 add.addEventListener('click',()=>{const o=active();if(!o||state.playing||o.sequence)return;o.sequence=newSequence();record('Blueprint : ajouter une séquence');notify()});
 document.addEventListener('warlike:change',()=>{if(!dialog.hidden)render()});
 document.addEventListener('warlike:workspace',()=>{if(!dialog.hidden)render()});
 dialog.addEventListener('keydown',e=>{if(e.key==='Escape'){e.stopPropagation();hide()}});
}
