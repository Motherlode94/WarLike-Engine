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
