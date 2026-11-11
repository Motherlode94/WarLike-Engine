// Fallback Inspector for registered data-driven Web components without a
// dedicated editor. Never replace a custom inspector and never mutate in Play.
import {componentChoices,resetObjectComponent,removeObjectComponent,componentRemovalBlockers} from '../core/component-definitions.js';
import {commonInspectorFields,inspectValue,setInspectorValue,inspectorNumber} from '../core/inspector-model.js';
import {state,notify} from '../core/state.js';
import {record} from '../core/history.js';
import {workspace} from '../core/workspaces.js';

const dedicated=new Set([
 'webScripts','warScripts','sequence','animatorGraph',
 'collider2d','rigidbody2d','controller2d','collider3d','rigidbody3d','joint3d',
 'controller3d','cameraRig','stats','inventory','ai',
 'adventure','adventureInteractable','survival','survivalNode','survivalWorld',
 'superhero','rpgProgression','fxEmitter','simulationNode','tacticalUnit'
]);
const text=(tag,value,cls='')=>{const e=document.createElement(tag);e.textContent=value;if(cls)e.className=cls;return e};
export function genericComponentDefinitions(entity,mode,rendered=[]){
 const present=new Set(rendered);
 return componentChoices(mode).filter(d=>!dedicated.has(d.id)&&
   entity?.[d.id]!=null&&!present.has(d.id)&&
   entity[d.id]&&typeof entity[d.id]==='object'&&!Array.isArray(entity[d.id]));
}
export function renderGenericComponents(root,entity){
 const shown=[...root.querySelectorAll(':scope>.inspector-component')]
  .map(card=>card.dataset.componentKey).filter(Boolean);
 for(const definition of genericComponentDefinitions(entity,workspace.mode,shown)){
  const card=document.createElement('details');
  card.className='inspector-component';
  card.dataset.componentKey=definition.id;
  card.dataset.componentTitle=definition.name;
  const summary=text('summary',definition.name);
  const body=document.createElement('div');body.className='component-content';
  const fields=commonInspectorFields([entity[definition.id]]);
  for(const path of fields){
   const value=inspectValue(entity[definition.id],path);
   if(!['boolean','string','number'].includes(typeof value))continue;
   const row=document.createElement('div');row.className='property-row';
   const name=text('label',path.join(' · '));
   const input=document.createElement('input');
   input.type=typeof value==='boolean'?'checkbox':'text';
   if(typeof value==='number')input.inputMode='decimal';
   if(typeof value==='boolean')input.checked=value;else input.value=String(value);
   input.disabled=state.playing;
   input.onchange=()=>{
    try{
     const next=typeof value==='boolean'?input.checked:
       typeof value==='number'?inspectorNumber(input.value):input.value;
     if(!setInspectorValue([entity[definition.id]],path,next))throw Error('Propriété non modifiable');
     record('Inspector : '+definition.name+' · '+path.join('.'));notify();
    }catch(error){if(input.setCustomValidity){input.setCustomValidity(error.message);input.reportValidity?.()}}
   };
   input.oninput=()=>input.setCustomValidity?.('');
   row.append(name,input);body.append(row);
  }
  if(!fields.length)body.append(text('p','Ce composant contient des données complexes. Utilise son éditeur spécialisé ou la configuration de son extension.'));
  const actions=document.createElement('div');actions.className='warlike-component-actions';
  const reset=text('button','Réinitialiser'),remove=text('button','Supprimer');
  reset.type=remove.type='button';
  reset.disabled=state.playing;
  const blockers=componentRemovalBlockers(entity,definition.id);
  remove.disabled=state.playing||blockers.length>0;
  if(blockers.length)remove.title='Requis par : '+blockers.join(', ');
  reset.onclick=()=>{if(state.playing)return;if(resetObjectComponent(entity,definition.id)){record('Réinitialiser '+definition.name);notify()}};
  remove.onclick=()=>{if(state.playing)return;if(removeObjectComponent(entity,definition.id)){record('Supprimer '+definition.name);notify()}};
  actions.append(reset,remove);body.append(actions);card.append(summary,body);root.append(card);
 }
}
