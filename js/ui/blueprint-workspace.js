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
  target.textContent=o?'Objet : '+(o.name||'GameObject')+' · ID '+o.id:'Aucun GameObject sélectionné';
  add.disabled=!o||state.playing||!!o.sequence;
  if(!o){
   const p=document.createElement('p');p.textContent='Sélectionne un objet dans Hierarchy pour créer son Blueprint.';content.append(p);return;
  }
  const note=document.createElement('p');note.className='blueprint-note';
  note.textContent='WarLike Blueprint utilise le moteur de séquences du projet. Les modifications sont enregistrées dans la scène et exécutées pendant Play.';
  content.append(note);
  renderSequenceEditor(content,o);
 };
 const show=()=>{render();dialog.hidden=false;openButton.setAttribute('aria-expanded','true')};
 const hide=()=>{dialog.hidden=true;openButton.setAttribute('aria-expanded','false');openButton.focus()};
 openButton.addEventListener('click',()=>dialog.hidden?show():hide());
 close.addEventListener('click',hide);
 add.addEventListener('click',()=>{const o=active();if(!o||state.playing||o.sequence)return;o.sequence=newSequence();record('Blueprint : ajouter une séquence');notify()});
 document.addEventListener('warlike:change',()=>{if(!dialog.hidden)render()});
 dialog.addEventListener('keydown',e=>{if(e.key==='Escape'){e.stopPropagation();hide()}});
}
