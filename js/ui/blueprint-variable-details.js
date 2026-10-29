import {variableTypes,coerceVariable} from '../core/blueprint-graph.js';
import {objectBlueprintVariables,renameBlueprintVariable,changeBlueprintVariableType,blueprintInstanceValue,setBlueprintInstanceValue} from '../core/blueprint-variables.js';
import {state,notify} from '../core/state.js';
import {record} from '../core/history.js';
import {saveProject} from '../core/project-hub.js';
import {element,button,field,select} from './blueprint-controls.js';
export const blueprintTypeLabels={number:'Nombre',boolean:'Booléen',string:'Texte',vector2:'Vecteur 2D',vector3:'Vecteur 3D'};
export function blueprintValueField(host,label,type,value,onChange){
 const row=element('label','bp-field bp-variable-value'),input=element('input');row.append(element('span','',label));input.setAttribute('aria-label',label);input.disabled=state.playing;
 if(type==='boolean'){input.type='checkbox';input.checked=value===true;input.onchange=()=>onChange(input.checked)}
 else{input.type=type==='number'?'number':'text';if(type==='number')input.step='any';input.value=Array.isArray(value)?value.join(', '):String(value??'');input.onchange=()=>{const raw=input.value;if(type==='number'&&!Number.isFinite(Number(raw)))return;const parts=type.startsWith('vector')?raw.split(',').map(Number):null;if(parts&&(parts.length!==Number(type.at(-1))||parts.some(n=>!Number.isFinite(n)))){input.setCustomValidity('Indique '+type.at(-1)+' nombres séparés par des virgules.');input.reportValidity();return}input.setCustomValidity('');onChange(coerceVariable(type,parts||raw))}}
 row.append(input);host.append(row);return input;
}
export function renderBlueprintVariableDetails(host,owner,v,onChange){
 host.append(element('span','bp-eyebrow','DÉTAILS DE LA VARIABLE'),element('h2','',v.name));const error=element('p','bp-variable-error');error.setAttribute('role','status');
 const nameRow=element('label','bp-field'),name=element('input');name.value=v.name;name.setAttribute('aria-label','Nom de la variable');name.disabled=state.playing;nameRow.append(element('span','','Nom de la variable'),name);host.append(nameRow);name.onchange=()=>{try{renameBlueprintVariable(owner,v,name.value);onChange('Renommer la variable',v.name)}catch(e){error.textContent=e.message;name.value=v.name}};
 select(host,'Type de variable',v.type,variableTypes.map(value=>({value,label:blueprintTypeLabels[value]})),type=>{changeBlueprintVariableType(owner,v,type);onChange('Type de variable',v.name)});
 field(host,{key:'category',label:'Catégorie',type:'text'},v,()=>onChange('Catégorie',v.name));field(host,{key:'tooltip',label:'Description / infobulle',type:'text'},v,()=>onChange('Description',v.name));
 const exposed=element('label','bp-expose-variable'),check=element('input');check.type='checkbox';check.checked=!!v.exposed;check.disabled=state.playing;check.onchange=()=>{v.exposed=check.checked;onChange('Exposition de la variable',v.name)};exposed.append(check,element('span','','Modifiable dans l’Inspecteur'));host.append(exposed);
 blueprintValueField(host,'Valeur par défaut',v.type,v.value,value=>{v.value=value;onChange('Valeur par défaut',v.name)});
 host.append(element('p','bp-hint',v.exposed?'La scène peut remplacer cette valeur dans l’Inspecteur. ↶ rétablit la valeur par défaut.':'Variable privée : utilisée par les comportements de cet objet.'));
 button(host,'Supprimer la variable',()=>{owner.blueprintVariables=owner.blueprintVariables.filter(other=>other!==v);if(owner.blueprintOverrides)delete owner.blueprintOverrides[v.name];onChange('Supprimer une variable',null)},'bp-text-button bp-danger');host.append(error);
}
export function renderBlueprintInstance(root,owner,component){
 const variables=objectBlueprintVariables(owner);if(!variables.length&&!owner.sequence&&!owner.sequences?.length)return;
 component(root,'Blueprint · Valeurs d’instance',body=>{
  const info=element('div','inspector-blueprint-summary');info.append(element('strong','',owner.name),element('small','',variables.length+' variables · '+(Number(!!owner.sequence)+(owner.sequences?.length||0))+' événements'));body.append(info);
  const open=button(body,'⬡ Modifier le Blueprint',()=>document.dispatchEvent(new CustomEvent('warlike:open-blueprint-defaults',{detail:{ownerId:owner.id}})),'bp-secondary');open.disabled=false;
  const exposed=variables.filter(v=>v.exposed);if(!exposed.length)body.append(element('p','bp-hint','Expose une variable dans Blueprint → Variables pour régler ses valeurs ici.'));
  const save=label=>{record('Blueprint : '+label);saveProject();notify()};
  for(const category of new Set(exposed.map(v=>v.category?.trim()||'Gameplay'))){const group=element('section','inspector-blueprint-category');group.append(element('h4','',category));for(const v of exposed.filter(v=>(v.category?.trim()||'Gameplay')===category)){const row=element('div','inspector-blueprint-variable');row.dataset.variableType=v.type;row.title=v.tooltip||blueprintTypeLabels[v.type];blueprintValueField(row,v.name,v.type,blueprintInstanceValue(owner,v),value=>{setBlueprintInstanceValue(owner,v,value);save('Valeur d’instance '+v.name)});const reset=button(row,'↶',()=>{delete owner.blueprintOverrides[v.name];save('Rétablir '+v.name)},'bp-variable-reset');reset.title='Rétablir la valeur par défaut';reset.setAttribute('aria-label','Rétablir '+v.name);reset.disabled=state.playing||!Object.hasOwn(owner.blueprintOverrides||{},v.name);group.append(row)}body.append(group)}
 });
}
